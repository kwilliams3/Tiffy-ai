import assert from "node:assert/strict";
import { test } from "node:test";
import { VoiceInput } from "../src/lib/voice-input.ts";
import { VoiceConversation } from "../src/lib/voice-conversation.ts";

function discussionHarness(ask = async () => ({ id: "reply", content: "Bonjour" })) {
  let callbacks, done;
  const events = [], errors = [];
  const voice = {
    start(text, error, listening) { callbacks = { text, error, listening }; listening(true); events.push("listen"); },
    stop() { events.push("mic-stop"); callbacks.listening(false); },
    abort() { events.push("abort"); callbacks?.listening(false); },
  };
  const discussion = new VoiceConversation({ voice, ask: text => { events.push(text); return ask(text); },
    speak(id, text, fail, end) { events.push("speak"); done = end; return true; },
    cancel() { events.push("cancel"); }, error: text => errors.push(text) });
  return { discussion, events, errors, text: text => callbacks.text(text), end: () => callbacks.listening(false), done: () => done(), fail: () => callbacks.error("Micro refusé") };
}
test("discussion sends after silence, speaks once and reopens the microphone", async context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const h = discussionHarness();
  h.discussion.start(); h.text("Salut");
  context.mock.timers.tick(1000); assert.equal(h.discussion.getSnapshot(), "listening");
  h.text("Salut Tiffy"); context.mock.timers.tick(1400);
  assert.equal(h.discussion.getSnapshot(), "thinking");
  await Promise.resolve(); await Promise.resolve();
  assert.equal(h.discussion.getSnapshot(), "speaking");
  assert.equal(h.events.filter(x => x === "Salut Tiffy").length, 1);
  h.done(); assert.equal(h.discussion.getSnapshot(), "listening");
  h.discussion.stop(); assert.equal(h.discussion.getSnapshot(), "off");
});
test("stopping discussion ignores late model replies and speech callbacks", async () => {
  let resolve;
  const h = discussionHarness(() => new Promise(r => { resolve = r; }));
  h.discussion.start(); h.text("Bonjour"); h.end(); h.discussion.stop();
  resolve({ id: "late", content: "Réponse" }); await Promise.resolve(); await Promise.resolve();
  assert.equal(h.discussion.getSnapshot(), "off"); assert.equal(h.events.includes("speak"), false);
  const second = discussionHarness(); second.discussion.start(); second.text("Salut"); second.end();
  await Promise.resolve(); await Promise.resolve(); second.discussion.stop(); second.done();
  assert.equal(second.discussion.getSnapshot(), "off");
});
test("discussion stops on microphone and model failures without restarting", async () => {
  const h = discussionHarness(); h.discussion.start(); h.fail();
  assert.equal(h.discussion.getSnapshot(), "paused"); assert.equal(h.errors.length, 1);
  const failed = discussionHarness(async () => undefined);
  failed.discussion.start(); failed.text("Bonjour"); failed.end(); await Promise.resolve(); await Promise.resolve();
  assert.equal(failed.discussion.getSnapshot(), "paused"); assert.equal(failed.errors.length, 1);
});

test("pausing discussion cancels the turn and resumes with a fresh microphone session", async () => {
  const h = discussionHarness();
  h.discussion.start(); h.text("Brouillon abandonné"); h.discussion.pause();
  assert.equal(h.discussion.getSnapshot(), "paused");
  assert.equal(h.events.includes("Brouillon abandonné"), false);
  h.discussion.start(); assert.equal(h.discussion.getSnapshot(), "listening");
  h.discussion.stop(); assert.equal(h.discussion.getSnapshot(), "off");
});

test("a stalled voice request times out, cancels the request and ignores a late reply", async context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let resolve;
  const h = discussionHarness(() => new Promise(r => { resolve = r; }));
  h.discussion.start(); h.text("Bonjour"); h.end();
  assert.equal(h.discussion.getSnapshot(), "thinking");
  context.mock.timers.tick(50_000);
  assert.equal(h.discussion.getSnapshot(), "paused");
  assert.match(h.errors[0], /trop de temps/);
  assert.equal(h.events.at(-1), "cancel");
  resolve({ id: "late", content: "Bonjour" }); await Promise.resolve(); await Promise.resolve();
  assert.equal(h.events.includes("speak"), false);
  h.discussion.stop();
});

test("a completed voice reply clears its generation deadline", async context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const h = discussionHarness(); h.discussion.start(); h.text("Bonjour"); h.end();
  await Promise.resolve(); await Promise.resolve();
  context.mock.timers.tick(50_000);
  assert.equal(h.discussion.getSnapshot(), "speaking"); assert.deepEqual(h.errors, []);
  h.discussion.stop();
});
import { SpeechPlayback, speechChunks, speechText } from "../src/lib/speech-playback.ts";
import { loadAutoSpeak, saveAutoSpeak, loadBanterMode, saveBanterMode } from "../src/lib/chat-preferences.ts";

function recognizer() {
  return { lang: "", continuous: false, interimResults: false, onresult: null, onerror: null, onend: null,
    started: 0, stopped: 0, aborted: 0,
    start() { this.started++; }, stop() { this.stopped++; }, abort() { this.aborted++; } };
}

test("real voice adapter ends a single speech turn, sends once and reports the transcript", async () => {
  const recognition = recognizer(), spoken = [], sent = [], transcripts = [], errors = [];
  const voice = new VoiceInput(() => recognition);
  recognition.stop = function () { this.stopped++; this.onend?.(); };
  const discussion = new VoiceConversation({ voice,
    ask: async text => { sent.push(text); return { id: "response", content: "Salut !" }; },
    speak: (id, text) => { spoken.push(text); return true; }, cancel() {},
    error: text => errors.push(text), transcript: text => transcripts.push(text) });
  discussion.start();
  assert.equal(recognition.continuous, false);
  recognition.onresult(results("Bonjour Tiffy"));
  assert.equal(transcripts.at(-1), "Bonjour Tiffy");
  discussion.sendTurn(); discussion.sendTurn();
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(sent, ["Bonjour Tiffy"]); assert.deepEqual(spoken, ["Salut !"]);
  assert.deepEqual(errors, []); discussion.stop();
});

test("recognition denial keeps discussion open and retryable instead of hiding its error", () => {
  const recognition = recognizer(), errors = [];
  const discussion = new VoiceConversation({ voice: new VoiceInput(() => recognition), ask: assert.fail,
    speak: assert.fail, cancel() {}, error: text => errors.push(text) });
  discussion.start(); recognition.onerror({ error: "not-allowed" });
  assert.equal(discussion.getSnapshot(), "paused"); assert.match(errors[0], /Autorise le microphone/);
  discussion.start(); assert.equal(discussion.getSnapshot(), "listening"); discussion.stop();
});
function results(...texts) { return { results: texts.map(transcript => ({ 0: { transcript } })) }; }

test("dictation starts only on request and keeps final results while stopping", () => {
  const recognition = recognizer();
  const session = new VoiceInput(() => recognition);
  const transcripts = [], states = [];
  assert.equal(recognition.started, 0);
  session.start(text => transcripts.push(text), assert.fail, state => states.push(state));
  assert.equal(recognition.started, 1);
  assert.equal(recognition.lang, "fr-FR");
  recognition.onresult(results("Bonjour"));
  recognition.onresult(results("Bonjour Tiffy", "comment vas-tu ?"));
  session.stop(); session.stop();
  assert.equal(recognition.stopped, 1);
  recognition.onresult(results("Bonjour Tiffy", "comment vas-tu aujourd’hui ?"));
  recognition.onend();
  assert.equal(transcripts.at(-1), "Bonjour Tiffy comment vas-tu aujourd’hui ?");
  assert.deepEqual(states, [true, false]);
  assert.equal(recognition.onresult, null);
});

test("microphone denial reports a useful error and releases the session", () => {
  const recognition = recognizer(), errors = [], states = [];
  const session = new VoiceInput(() => recognition);
  session.start(() => {}, text => errors.push(text), value => states.push(value));
  recognition.onerror({ error: "not-allowed" });
  assert.match(errors[0], /Autorise le microphone/);
  assert.equal(recognition.aborted, 1);
  assert.equal(states.at(-1), false);
});

test("aborted recognition cannot overwrite a later draft", () => {
  const recognition = recognizer(), transcripts = [];
  const session = new VoiceInput(() => recognition);
  session.start(text => transcripts.push(text), assert.fail, () => {});
  const lateResult = recognition.onresult;
  session.abort();
  lateResult(results("obsolete text"));
  assert.deepEqual(transcripts, []);
  assert.equal(recognition.aborted, 1);
});

test("unavailable recognition does not activate a microphone", () => {
  const errors = [], states = [];
  new VoiceInput(() => undefined).start(() => {}, text => errors.push(text), value => states.push(value));
  assert.match(errors[0], /pas disponible/);
  assert.deepEqual(states, []);
});

function speechPlatform() {
  const utterances = [];
  let cancelled = 0;
  class Utterance { constructor(text) { this.text = text; } }
  const synth = { cancel() { cancelled++; }, resume() {}, getVoices: () => [{ lang: "en-US" }, { lang: "fr-FR", name: "French" }], speak: value => utterances.push(value) };
  return { platform: { synth, Utterance }, utterances, cancelled: () => cancelled };
}

test("speech strips Markdown and skips fenced code instead of reading syntax", () => {
  const text = speechText('# Bonjour **Williams**\n[un lien](https://example.com)\n```js\nconst secret = 2;\n```');
  assert.match(text, /Bonjour Williams/);
  assert.match(text, /un lien/);
  assert.match(text, /bloc de code/);
  assert.doesNotMatch(text, /https:|secret|\*\*/);
  const chunks = speechChunks("Une longue réponse. ".repeat(100));
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(chunk => chunk.length <= 220));
});

test("speech uses a French voice and advances through chunks once", () => {
  const fake = speechPlatform();
  const player = new SpeechPlayback(() => fake.platform);
  assert.equal(player.play("reply", "Une réponse assez longue. ".repeat(25)), true);
  assert.equal(player.getSnapshot(), "reply");
  assert.equal(fake.utterances[0].voice.name, "French");
  assert.equal(fake.utterances[0].lang, "fr-FR");
  let index = 0;
  while (index < fake.utterances.length) fake.utterances[index++].onend();
  assert.equal(player.getSnapshot(), null);
  assert.ok(fake.utterances.length > 1);
});

test("stopping speech prevents obsolete end callbacks from starting more audio", () => {
  const fake = speechPlatform();
  const player = new SpeechPlayback(() => fake.platform);
  player.play("old", "Une réponse longue. ".repeat(100));
  const old = fake.utterances[0];
  player.stop(); old.onend();
  assert.equal(fake.utterances.length, 1);
  assert.equal(player.getSnapshot(), null);
  player.play("new", "Une nouvelle réponse.");
  old.onerror();
  assert.equal(player.getSnapshot(), "new");
  player.stop();
});

test("speech errors release controls and unsupported browsers fail gracefully", () => {
  assert.equal(new SpeechPlayback(() => undefined).play("id", "Bonjour"), false);
  const fake = speechPlatform(), errors = [];
  const player = new SpeechPlayback(() => fake.platform);
  player.play("id", "Bonjour", () => errors.push("blocked"));
  fake.utterances[0].onerror();
  assert.deepEqual(errors, ["blocked"]);
  assert.equal(player.getSnapshot(), null);
});

test("silent speech-engine failure is detected and can be replayed from a click", context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const fake = speechPlatform(), errors = [];
  const player = new SpeechPlayback(() => fake.platform);
  player.play("id", "Bonjour", () => errors.push("blocked"));
  context.mock.timers.tick(10_000);
  assert.deepEqual(errors, ["blocked"]); assert.equal(player.getSnapshot(), null);
  player.play("id", "Bonjour");
  fake.utterances.at(-1).onstart();
  context.mock.timers.tick(10_000);
  assert.equal(player.getSnapshot(), "id");
  fake.utterances.at(-1).onend();
  assert.equal(player.getSnapshot(), null);
});

test("replaying a completed voice reply does not submit a new model request", () => {
  const h = discussionHarness();
  h.discussion.replay({ id: "reply", content: "Bonjour" });
  assert.equal(h.discussion.getSnapshot(), "speaking");
  assert.deepEqual(h.events, ["abort", "cancel", "speak"]);
  h.done(); assert.equal(h.discussion.getSnapshot(), "listening"); h.discussion.stop();
});

test("automatic spoken replies are opt-in and preserve other preferences", () => {
  let value = "{}";
  const storage = { getItem: () => value, setItem: (_key, text) => { value = text; } };
  assert.equal(loadAutoSpeak(storage), false);
  saveBanterMode(storage, true); saveAutoSpeak(storage, true);
  assert.equal(loadAutoSpeak(storage), true);
  assert.equal(loadBanterMode(storage), true);
  saveAutoSpeak(storage, false);
  assert.equal(loadAutoSpeak(storage), false);
});
