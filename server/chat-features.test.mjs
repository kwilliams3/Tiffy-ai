import assert from "node:assert/strict";
import { test } from "node:test";
import { ChatStore, loadConversations } from "../src/lib/chat-store.ts";
import { serializeConversations } from "../src/lib/chat-export.ts";
import { highlightCode } from "../src/lib/code-highlight.ts";
import { readChatStream } from "../src/lib/chat-stream.ts";
import { loadBanterMode, saveBanterMode, loadReplyPreferences, saveReplyPreference } from "../src/lib/chat-preferences.ts";
import { deliverReplyAlerts, notificationPermission, supportsReplySound, prepareReplySound, playReplySound, requestReplyNotifications, showReplyNotification } from "../src/lib/response-alerts.ts";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

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

test("banter is opt-in, survives reload and does not modify the conversation storage", () => {
  const data = new Map([["tiffy_conversations", "[]"], ["tiffy_preferences", JSON.stringify({ otherPreference: "kept" })]]);
  const storage = { getItem: name => data.get(name) ?? null, setItem: (name, value) => data.set(name, value) };
  assert.equal(loadBanterMode(storage), false);
  saveBanterMode(storage, true);
  assert.equal(new ChatStore({ storage }).getSnapshot().banterMode, true);
  assert.equal(JSON.parse(data.get("tiffy_preferences")).otherPreference, "kept");
  assert.equal(data.get("tiffy_conversations"), "[]");
  saveBanterMode(storage, false);
  assert.equal(loadBanterMode(storage), false);
  data.set("tiffy_preferences", '{"banterMode":"true"}');
  assert.equal(loadBanterMode(storage), false);
});

test("the latest personality setting is sent on new messages, retries and edits", async () => {
  const data = new Map();
  const storage = { getItem: name => data.get(name) ?? null, setItem: (name, value) => data.set(name, value) };
  const sent = [];
  const store = new ChatStore({ storage, fetcher: async (_url, init) => { sent.push(JSON.parse(init.body)); return reply(); } });
  await store.sendMessage("Bonjour");
  assert.equal(sent.at(-1).banterMode, false);
  saveBanterMode(storage, true);
  await store.retryMessage(last(store).id);
  assert.equal(sent.at(-1).banterMode, true);
  assert.equal(store.getSnapshot().banterMode, true);
  saveBanterMode(storage, false);
  await store.editMessage(store.getSnapshot().conversations[0].messages[0].id, "Question sérieuse");
  assert.equal(sent.at(-1).banterMode, false);
});

test("notification and sound preferences are independent and preserve the chosen personality", () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  assert.deepEqual(loadReplyPreferences(storage), { notifications: false, sounds: false });
  saveBanterMode(storage, true);
  saveReplyPreference(storage, "notifications", true);
  saveReplyPreference(storage, "sounds", true);
  assert.equal(loadBanterMode(storage), true);
  saveReplyPreference(storage, "notifications", false);
  assert.deepEqual(loadReplyPreferences(storage), { notifications: false, sounds: true });
  data.set("tiffy_preferences", "broken");
  assert.deepEqual(loadReplyPreferences(storage), { notifications: false, sounds: false });
});

test("only a successfully completed reply emits one completion event", async () => {
  const completed = [];
  const store = new ChatStore({ fetcher: async () => reply(), onComplete: id => completed.push(id) });
  await store.sendMessage("Question");
  assert.deepEqual(completed, [store.getSnapshot().currentConversationId]);
  const errors = new ChatStore({ fetcher: async () => Response.json({ error: "Failed" }, { status: 500 }), onComplete: id => completed.push(id) });
  await errors.sendMessage("Question");
  const truncated = new ChatStore({ fetcher: async () => new Response(event("Partial"), { headers: { "Content-Type": "text/event-stream" } }), onComplete: id => completed.push(id) });
  await truncated.sendMessage("Question");
  assert.equal(completed.length, 1);
});

test("a stopped or obsolete request cannot trigger an alert", async () => {
  const completed = [];
  let resolve;
  const store = new ChatStore({ fetcher: async () => new Promise(done => { resolve = done; }), onComplete: id => completed.push(id) });
  const pending = store.sendMessage("Question");
  store.stopResponse();
  resolve(reply()); await pending;
  assert.deepEqual(completed, []);
});

test("a notification failure does not mark the answer as failed", async () => {
  const store = new ChatStore({ fetcher: async () => reply(), onComplete: () => { throw new Error("Notification blocked"); } });
  await store.sendMessage("Question");
  assert.equal(last(store).status, "complete");
  assert.equal(store.getSnapshot().activeMessageId, null);
});

test("alerts require preferences and notification permission; foreground replies only sound", async () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  let sounds = 0, hidden = true, permission = "granted";
  const notifications = [];
  const platform = { isHidden: () => hidden, permission: () => permission, notify: async id => notifications.push(id), playSound: () => { sounds++; } };
  await deliverReplyAlerts("private-conversation-id", storage, platform);
  assert.equal(sounds, 0); assert.equal(notifications.length, 0);
  saveReplyPreference(storage, "notifications", true); saveReplyPreference(storage, "sounds", true);
  await deliverReplyAlerts("private-conversation-id", storage, platform);
  assert.equal(sounds, 1); assert.deepEqual(notifications, ["private-conversation-id"]);
  hidden = false;
  await deliverReplyAlerts("other", storage, platform);
  assert.equal(sounds, 2); assert.equal(notifications.length, 1);
  hidden = true; permission = "denied";
  await deliverReplyAlerts("other", storage, platform);
  assert.equal(notifications.length, 1);
  saveReplyPreference(storage, "sounds", false);
  await deliverReplyAlerts("other", storage, platform);
  assert.equal(sounds, 3);
});

test("blocked audio or notification APIs do not reject completion handling", async () => {
  const storage = { getItem: () => '{"notifications":true,"sounds":true}', setItem() {} };
  await deliverReplyAlerts("c", storage, { isHidden: () => true, permission: () => "granted", notify: async () => { throw new Error("denied"); }, playSound: () => { throw new Error("blocked"); } });
  assert.equal(notificationPermission(), "unsupported");
  assert.equal(supportsReplySound(), false);
  assert.equal(await prepareReplySound(), false);
});

test("notification clicks focus the application and open the correct local conversation", async () => {
  const source = readFileSync(new URL("../public/notification-events.js", import.meta.url), "utf8");
  let handler, destination, focused = false, closed = false, work;
  const client = { url: "https://tiffy.example/", navigate: async url => { destination = url; }, focus: async () => { focused = true; } };
  const self = { location: { origin: "https://tiffy.example" }, clients: { matchAll: async () => [client] }, addEventListener: (_name, callback) => { handler = callback; } };
  runInNewContext(source, { self, URL });
  handler({ notification: { tag: "tiffy-reply-test", data: { conversationId: "a/b?c" }, close: () => { closed = true; } }, waitUntil: promise => { work = promise; } });
  await work;
  assert.equal(new URL(destination).origin, "https://tiffy.example");
  assert.equal(new URL(destination).searchParams.get("conversation"), "a/b?c");
  assert.equal(focused, true); assert.equal(closed, true);
});

test("notification clicks can reopen Tiffy if no existing window remains", async () => {
  const source = readFileSync(new URL("../public/notification-events.js", import.meta.url), "utf8");
  let handler, destination, work;
  const self = { location: { origin: "https://tiffy.example" }, clients: { matchAll: async () => [], openWindow: async url => { destination = url; } }, addEventListener: (_name, callback) => { handler = callback; } };
  runInNewContext(source, { self, URL });
  handler({ notification: { tag: "tiffy-reply-test", data: { conversationId: "c" }, close() {} }, waitUntil: promise => { work = promise; } });
  await work;
  assert.equal(destination, "https://tiffy.example/?conversation=c");
});

test("browser notifications request permission only when needed and prefer the mobile-compatible worker", async () => {
  const descriptors = new Map(["window", "navigator", "Notification"].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  let requested = 0, directNotifications = 0;
  const shown = [];
  class FakeNotification {
    static permission = "default";
    static async requestPermission() { requested++; this.permission = "granted"; return "granted"; }
    constructor() { directNotifications++; }
  }
  Object.defineProperty(globalThis, "window", { configurable: true, value: { isSecureContext: true, Notification: FakeNotification } });
  Object.defineProperty(globalThis, "Notification", { configurable: true, value: FakeNotification });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { serviceWorker: { getRegistration: async () => ({ active: {}, showNotification: async (title, options) => { shown.push({ title, options }); } }) } } });
  try {
    assert.equal(notificationPermission(), "default");
    assert.equal(requested, 0);
    assert.equal(await requestReplyNotifications(), "granted");
    assert.equal(await requestReplyNotifications(), "granted");
    assert.equal(requested, 1);
    await showReplyNotification("conversation-id");
    assert.equal(shown.length, 1);
    assert.equal(shown[0].options.data.conversationId, "conversation-id");
    assert.equal(shown[0].options.silent, true);
    assert.equal(directNotifications, 0);
    FakeNotification.permission = "denied";
    assert.equal(await requestReplyNotifications(), "denied");
    await showReplyNotification("other");
    assert.equal(shown.length, 1); assert.equal(requested, 1);
  } finally {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});

test("reply sound is primed explicitly and plays a short two-note chime", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const contexts = [], frequencies = [], starts = [], stops = [];
  let rejectResume = false;
  class FakeAudioContext {
    state = "suspended";
    currentTime = 5;
    destination = {};
    constructor() { contexts.push(this); }
    async resume() { if (rejectResume) throw new Error("blocked"); this.state = "running"; }
    createOscillator() { return { frequency: { setValueAtTime: value => frequencies.push(value) }, connect() {}, disconnect() {}, start: time => starts.push(time), stop(time) { stops.push(time); this.onended?.(); } }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  }
  Object.defineProperty(globalThis, "window", { configurable: true, value: { AudioContext: FakeAudioContext } });
  try {
    assert.equal(supportsReplySound(), true);
    assert.equal(contexts.length, 0);
    assert.equal(await prepareReplySound(), true);
    playReplySound();
    assert.deepEqual(frequencies, [587.33, 783.99]);
    assert.equal(starts.length, 2);
    assert.ok(stops.every((stop, index) => stop > starts[index] && stop - starts[index] < 0.3));
    assert.equal(await prepareReplySound(), true);
    assert.equal(contexts.length, 1);
    contexts[0].state = "closed"; rejectResume = true;
    assert.equal(await prepareReplySound(), false);
    playReplySound();
    assert.equal(frequencies.length, 2);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else delete globalThis.window;
  }
});
