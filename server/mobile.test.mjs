import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

function harness(permission = "granted") {
  const events = new Map(), calls = [], installed = {};
  const recognition = {
    available: async () => ({ available: true }),
    requestPermissions: async () => ({ speechRecognition: permission }),
    addListener: async (name, fn) => { events.set(name, fn); return { remove: async () => events.delete(name) }; },
    start: async options => calls.push(["mic", options]), stop: async () => calls.push(["stop-mic"]),
  };
  const modules = {
    "@capacitor/core": { Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" }, registerPlugin: () => ({ version: async () => ({ code: 1, name: "1.0" }), open: async () => {} }) },
    "./lib/app-updates": { configureAppUpdates: value => { installed.updates = value; } },
    "@capgo/capacitor-speech-recognition": { SpeechRecognition: recognition },
    "@capacitor-community/text-to-speech": { TextToSpeech: { speak: async options => calls.push(["speech", options]), stop: async () => calls.push(["stop-speech"]) } },
    "./lib/voice-input": { configureNativeRecognition: value => { installed.Recognition = value; } },
    "./lib/speech-playback": { configureNativeSpeech: value => { installed.speech = value; } },
  };
  const code = ts.transpileModule(readFileSync(new URL("../src/platform.mobile.ts", import.meta.url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exported = {};
  new Function("require", "exports", "document", "window", code)(name => {
    assert.ok(modules[name], name); return modules[name];
  }, exported, { documentElement: { classList: { add() {} }, style: { setProperty() {} } } }, { innerHeight: 800 });
  return { initialize: exported.initializePlatform, installed, calls, events };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test("native microphone requests permission, forwards text and releases listeners", async () => {
  const h = harness(); await h.initialize();
  const mic = new h.installed.Recognition(), texts = [];
  mic.onresult = event => texts.push(event.results[0][0].transcript);
  mic.start(); await settle();
  assert.equal(h.calls[0][0], "mic"); assert.equal(h.calls[0][1].language, "fr-FR");
  h.events.get("partialResults")({ matches: ["Bonjour"] }); assert.deepEqual(texts, ["Bonjour"]);
  mic.abort(); await settle(); assert.equal(h.events.size, 0);
  assert.ok(h.calls.some(call => call[0] === "stop-mic"));
});

test("native microphone denial reports permission error without opening audio", async () => {
  const h = harness("denied"); await h.initialize();
  const mic = new h.installed.Recognition(), errors = [];
  mic.onerror = event => errors.push(event.error);
  mic.start(); await settle(); assert.deepEqual(errors, ["not-allowed"]);
  assert.equal(h.calls.some(call => call[0] === "mic"), false);
});

test("native speech reads in French and cancels obsolete queued utterances", async () => {
  const h = harness(); await h.initialize();
  const { synth, Utterance } = h.installed.speech;
  const old = new Utterance("À ignorer"); synth.speak(old); synth.cancel();
  await settle(); assert.equal(h.calls.some(call => call[0] === "speech"), false);
  const reply = new Utterance("Bonjour"), lifecycle = [];
  reply.onstart = () => lifecycle.push("start"); reply.onend = () => lifecycle.push("end");
  synth.speak(reply); await settle();
  const options = h.calls.find(call => call[0] === "speech")[1];
  assert.equal(options.lang, "fr-FR"); assert.equal(options.category, "playback");
  assert.deepEqual(lifecycle, ["start", "end"]);
});
