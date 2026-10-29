import assert from "node:assert/strict";
import { test } from "node:test";
import { VoiceInput } from "../src/lib/voice-input.ts";
import { SpeechPlayback, speechChunks, speechText } from "../src/lib/speech-playback.ts";
import { loadAutoSpeak, saveAutoSpeak, loadBanterMode, saveBanterMode } from "../src/lib/chat-preferences.ts";

function recognizer() {
  return { lang: "", continuous: false, interimResults: false, onresult: null, onerror: null, onend: null,
    started: 0, stopped: 0, aborted: 0,
    start() { this.started++; }, stop() { this.stopped++; }, abort() { this.aborted++; } };
}
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
