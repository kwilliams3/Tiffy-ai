import assert from "node:assert/strict";
import { test } from "node:test";
import { ChatStore, loadConversations } from "../src/lib/chat-store.ts";
import { serializeConversations } from "../src/lib/chat-export.ts";
import { highlightCode } from "../src/lib/code-highlight.ts";
import { readChatStream } from "../src/lib/chat-stream.ts";

const event = text => `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
const reply = (text = "Bonjour 🌿") => new Response(event(text) + "data: [DONE]\n\n", { headers: { "Content-Type": "text/event-stream" } });
const last = store => store.getSnapshot().conversations.find(c => c.id === store.getSnapshot().currentConversationId)?.messages.at(-1);
const memoryStorage = () => { let value = "[]"; return { getItem: () => value, setItem: (_key, data) => { value = data; } }; };
async function until(check) { for (let i = 0; i < 50; i++) { if (check()) return; await new Promise(resolve => setImmediate(resolve)); } assert.fail("Condition was not reached"); }

test("preserves the user's message after an error and retries without duplicating it", async () => {
  let calls = 0;
  const bodies = [];
  const store = new ChatStore({ storage: memoryStorage(), fetcher: async (_url, init) => {
    bodies.push(JSON.parse(init.body));
    return ++calls === 1 ? Response.json({ error: "Quota atteint" }, { status: 429 }) : reply();
  } });
  await store.sendMessage("Ma question");
  assert.equal(last(store).status, "error");
  assert.equal(last(store).error, "Quota atteint");
  await store.retryMessage(last(store).id);
  const messages = store.getSnapshot().conversations[0].messages;
  assert.equal(messages.length, 2);
  assert.equal(messages[0].content, "Ma question");
  assert.equal(messages[1].status, "complete");
  assert.deepEqual(bodies[0], bodies[1]);
});

test("stopping a partial stream preserves its text and cancels the reader", async () => {
  let cancelled = false;
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(event("Une réponse partielle"))); }, cancel() { cancelled = true; } });
  const store = new ChatStore({ fetcher: async () => new Response(stream, { headers: { "Content-Type": "text/event-stream" } }) });
  const pending = store.sendMessage("Question");
  await until(() => last(store)?.content === "Une réponse partielle");
  store.stopResponse(); await pending;
  assert.equal(last(store).status, "stopped");
  assert.equal(last(store).content, "Une réponse partielle");
  assert.equal(last(store).error, undefined);
  assert.equal(cancelled, true);
  assert.equal(store.getSnapshot().activeMessageId, null);
});

test("late results from a stopped request cannot overwrite a retry", async () => {
  let resolveOld;
  let calls = 0;
  const store = new ChatStore({ fetcher: async () => ++calls === 1 ? new Promise(resolve => { resolveOld = resolve; }) : reply("Nouvelle réponse") });
  const old = store.sendMessage("Question");
  store.stopResponse();
  await store.retryMessage(last(store).id);
  resolveOld(reply("Ancienne réponse")); await old;
  assert.equal(last(store).content, "Nouvelle réponse");
  assert.equal(last(store).status, "complete");
});

test("editing an earlier message replaces downstream turns", async () => {
  const sent = [];
  const store = new ChatStore({ fetcher: async (_url, init) => { sent.push(JSON.parse(init.body)); return reply(); } });
  await store.sendMessage("Première version");
  const id = store.getSnapshot().conversations[0].messages[0].id;
  await store.sendMessage("Deuxième question");
  await store.editMessage(id, "Version corrigée");
  const messages = store.getSnapshot().conversations[0].messages;
  assert.equal(messages.length, 2);
  assert.equal(messages[0].id, id);
  assert.equal(messages[0].content, "Version corrigée");
  assert.deepEqual(sent.at(-1).messages, [{ role: "user", content: "Version corrigée" }]);
});

test("a double submission creates only one request", async () => {
  let resolve;
  let calls = 0;
  const store = new ChatStore({ fetcher: async () => { calls++; return new Promise(done => { resolve = done; }); } });
  const first = store.sendMessage("Une question");
  await store.sendMessage("Doublon");
  assert.equal(calls, 1);
  resolve(reply()); await first;
  assert.equal(store.getSnapshot().conversations[0].messages.length, 2);
});

test("a truncated stream keeps its partial text and exposes a retryable error", async () => {
  const store = new ChatStore({ fetcher: async () => new Response(event("Texte reçu"), { headers: { "Content-Type": "text/event-stream" } }) });
  await store.sendMessage("Question");
  assert.equal(last(store).content, "Texte reçu");
  assert.equal(last(store).status, "error");
});

test("SSE parser handles fragmented UTF-8, CRLF, unspaced data and a final event without newline", async () => {
  const bytes = new TextEncoder().encode(event("Été 🌿").replaceAll("data: ", "data:").replaceAll("\n", "\r\n") + "data:[DONE]");
  const stream = new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i++) controller.enqueue(bytes.slice(i, i + 1)); controller.close(); } });
  let text = "";
  await readChatStream(new Response(stream, { headers: { "Content-Type": "text/event-stream" } }), chunk => { text += chunk; }, new AbortController().signal);
  assert.equal(text, "Été 🌿");
});

test("empty, malformed and non-stream responses become readable errors", async () => {
  for (const response of [reply(""), new Response("data: broken\n\n", { headers: { "Content-Type": "text/event-stream" } }), new Response("<html>wrong route</html>")]) {
    await assert.rejects(readChatStream(response, () => {}, new AbortController().signal));
  }
});

test("JSON export preserves the complete local conversation; Markdown includes readable turns", async () => {
  const storage = memoryStorage();
  const store = new ChatStore({ storage, fetcher: async () => reply("Une idée 🌿") });
  await store.sendMessage("Écrire un projet");
  const conversations = store.getSnapshot().conversations;
  assert.deepEqual(JSON.parse(serializeConversations(conversations, "json")).conversations, conversations);
  const markdown = serializeConversations(conversations, "md");
  assert.match(markdown, /## Toi\n\nÉcrire un projet/);
  assert.match(markdown, /## Tiffy\n\nUne idée 🌿/);
  assert.equal(loadConversations(storage)[0].messages.length, 2);
});

test("interrupted saved streams reload as stopped and malformed storage is ignored", () => {
  const conversation = { id: "c", title: "Test", created_at: "2026-01-01", updated_at: "2026-01-01", messages: [{ id: "m", role: "assistant", content: "Partial", status: "streaming" }] };
  assert.equal(loadConversations({ getItem: () => JSON.stringify([conversation]), setItem() {} })[0].messages[0].status, "stopped");
  assert.deepEqual(loadConversations({ getItem: () => "broken", setItem() {} }), []);
});

test("syntax highlighting preserves literal code and safely handles unknown languages", () => {
  const code = 'const html = "<script>alert(1)</script>"; // commentaire\nreturn 42;';
  const tokens = highlightCode(code, "js");
  assert.equal(tokens.map(token => token.text).join(""), code);
  for (const kind of ["keyword", "string", "comment", "number"]) assert.ok(tokens.some(token => token.kind === kind));
  assert.deepEqual(highlightCode(code, "unknown"), [{ text: code }]);
  assert.equal(highlightCode('{"clé": true}', "json")[1].kind, "key");
});

test("long unicode conversations send bounded context but retain the full local history", async () => {
  const sent = [];
  const store = new ChatStore({ fetcher: async (_url, init) => { sent.push(init.body); return reply("回".repeat(15_000)); } });
  for (let i = 0; i < 5; i++) await store.sendMessage("问".repeat(10_000));
  const all = store.getSnapshot().conversations[0].messages;
  assert.equal(all.length, 10);
  assert.equal(all[1].content.length, 15_000);
  for (const body of sent) {
    assert.ok(new TextEncoder().encode(body).length <= 60_000);
    for (const message of JSON.parse(body).messages) assert.ok(message.content.length <= 12_000);
  }
});

test("switching conversations stops generation and deletion cannot revive a response", async () => {
  let resolve;
  const store = new ChatStore({ fetcher: async () => new Promise(done => { resolve = done; }) });
  const pending = store.sendMessage("Question");
  const id = store.getSnapshot().currentConversationId;
  store.startNewConversation();
  assert.equal(store.getSnapshot().activeMessageId, null);
  assert.equal(store.getSnapshot().conversations[0].messages.at(-1).status, "stopped");
  store.deleteConversation(id);
  resolve(reply()); await pending;
  assert.equal(store.getSnapshot().conversations.length, 0);
});
