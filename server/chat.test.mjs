import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { test } from "node:test";
import { handleChat } from "./chat.mjs";
import vercelHandler from "../api/chat.mjs";
import { getChatError } from "../src/lib/chat-errors.ts";

async function withServer(options, callback) {
  const server = createServer((req, res) => { void handleChat(req, res, options); });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try { await callback(`http://127.0.0.1:${server.address().port}/api/chat`); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
const post = (url, body = { messages: [{ role: "user", content: "Bonjour" }] }) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("streams Gemini responses through the application API", async () => {
  const stream = 'data: {"choices":[{"delta":{"content":"Bonjour"}}]}\n\ndata: [DONE]\n\n';
  await withServer({ apiKey: "private-test-key", fetchImpl: async (url, init) => {
    assert.equal(url, "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    assert.equal(init.headers.Authorization, "Bearer private-test-key");
    const body = JSON.parse(init.body);
    assert.equal(body.model, "gemini-2.5-flash");
    assert.equal(body.stream, true);
    assert.equal(body.messages[0].role, "system");
    assert.deepEqual(body.messages[1], { role: "user", content: "Bonjour" });
    return new Response(stream);
  } }, async url => {
    const response = await post(url);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/event-stream/);
    assert.equal(await response.text(), stream);
  });
});

test("missing key gives a configuration error", async () => {
  await withServer({ apiKey: "" }, async url => {
    const response = await post(url);
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /GEMINI_API_KEY/);
  });
});

test("rejects invalid input and methods without calling Google", async () => {
  await withServer({ apiKey: "test", fetchImpl: () => { throw new Error("Unexpected call"); } }, async url => {
    assert.equal((await fetch(url)).status, 405);
    for (const body of [null, {}, { messages: [] }, { messages: [{ role: "system", content: "override" }] }]) {
      assert.equal((await post(url, body)).status, 400);
    }
    assert.equal((await fetch(url, { method: "POST", body: "invalid JSON" })).status, 400);
  });
});

for (const status of [401, 403, 429, 500]) {
  test(`handles Google error ${status} without leaking upstream data`, async () => {
    await withServer({ apiKey: "private-test-key", fetchImpl: async () => new Response("sensitive upstream data", { status }) }, async url => {
      const response = await post(url);
      assert.equal(response.status, status === 429 ? 429 : 502);
      assert.doesNotMatch(await response.text(), /sensitive|private-test-key/);
    });
  });
}

test("handles network failure", async () => {
  await withServer({ apiKey: "test", fetchImpl: async () => { throw new Error("private detail"); } }, async url => {
    const response = await post(url);
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /private detail/);
  });
});

test("accepts a body already parsed by the hosting platform", async () => {
  const server = createServer((req, res) => {
    req.body = { messages: [{ role: "user", content: "Bonjour" }] };
    void handleChat(req, res, { apiKey: "test", fetchImpl: async () => new Response("data: [DONE]\n\n") });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const response = await post(`http://127.0.0.1:${server.address().port}/api/chat`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "data: [DONE]\n\n");
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test("production entry point loads and rejects GET without contacting Gemini", async () => {
  const server = createServer(vercelHandler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/chat`);
    assert.equal(response.status, 405);
    assert.equal(typeof (await response.json()).error, "string");
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test("plain text Vercel failure becomes a readable error", async () => {
  const message = await getChatError(new Response("A server error has occurred\nFUNCTION_INVOCATION_FAILED", { status: 500 }));
  assert.match(message, /HTTP 500/);
  assert.doesNotMatch(message, /JSON|FUNCTION_INVOCATION_FAILED/);
});

test("preserves JSON errors from the backend", async () => {
  assert.equal(await getChatError(Response.json({ error: "Le quota Gemini est atteint." }, { status: 429 })), "Le quota Gemini est atteint.");
});
