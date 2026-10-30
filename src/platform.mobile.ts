import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { SpeechRecognition } from "@capgo/capacitor-speech-recognition";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { configureNativeRecognition, type Recognizer } from "./lib/voice-input";
import { configureNativeSpeech, type SpeechPlatform } from "./lib/speech-playback";

let cleanup = Promise.resolve();
class NativeRecognizer implements Recognizer {
  lang = "fr-FR"; continuous = false; interimResults = true;
  onresult: Recognizer["onresult"] = null;
  onerror: Recognizer["onerror"] = null;
  onend: Recognizer["onend"] = null;
  private active = false;
  private handles: PluginListenerHandle[] = [];
  private async listen() {
    await cleanup;
    if (!this.active) return;
    const { available } = await SpeechRecognition.available();
    if (!available) throw new Error("audio-capture");
    const permission = await SpeechRecognition.requestPermissions();
    if (permission.speechRecognition !== "granted") throw new Error("not-allowed");
    if (!this.active) return;
    const partial = await SpeechRecognition.addListener("partialResults", event => {
      if (this.active) this.onresult?.({ results: [{ 0: { transcript: event.matches?.[0] || "" } }] });
    });
    this.handles.push(partial);
    const state = await SpeechRecognition.addListener("listeningState", event => {
      if (event.status === "stopped" && this.active) this.finish();
    });
    this.handles.push(state);
    const error = await SpeechRecognition.addListener("error", () => {
      if (this.active) this.onerror?.({ error: "network" });
    });
    this.handles.push(error);
    if (!this.active) { this.removeListeners(); return; }
    await SpeechRecognition.start({ language: this.lang, partialResults: true, popup: false, maxResults: 1 });
  }
  start = () => {
    this.active = true;
    void this.listen().catch(error => {
      if (this.active) { this.onerror?.({ error: error instanceof Error && ["not-allowed", "audio-capture"].includes(error.message) ? error.message : "network" }); this.abort(); }
    });
  };
  private removeListeners() { for (const handle of this.handles.splice(0)) void handle.remove().catch(() => {}); }
  private finish() { this.active = false; this.removeListeners(); this.onend?.(); }
  stop = () => {
    if (!this.active) return;
    cleanup = cleanup.then(() => SpeechRecognition.stop()).catch(() => {});
    void cleanup.then(() => { if (this.active) this.finish(); });
  };
  abort = () => {
    const active = this.active;
    this.active = false; this.removeListeners();
    if (active) cleanup = cleanup.then(() => SpeechRecognition.stop()).catch(() => {});
  };
}

export async function initializePlatform() {
  if (!Capacitor.isNativePlatform()) return;
  document.documentElement.classList.add("native-mobile");
  const resize = () => document.documentElement.style.setProperty("--app-height", `${window.visualViewport?.height || window.innerHeight}px`);
  window.visualViewport?.addEventListener("resize", resize); resize();
  configureNativeRecognition(NativeRecognizer);
  let version = 0;
  let audio = Promise.resolve();
  class Utterance {
    text: string; lang = "fr-FR"; rate = 1; pitch = 1; volume = 1;
    onstart?: () => void; onend?: () => void; onerror?: () => void;
    constructor(text: string) { this.text = text; }
  }
  configureNativeSpeech({
    Utterance,
    synth: {
      getVoices: () => [], resume() {},
      cancel() { version++; audio = audio.then(() => TextToSpeech.stop()).catch(() => {}); },
      speak(utterance: Utterance) {
        const current = version;
        // Wait for cancellation and microphone teardown before claiming the audio session.
        void Promise.all([audio, cleanup]).then(async () => {
          if (current !== version) return;
          utterance.onstart?.();
          await TextToSpeech.speak({ text: utterance.text, lang: utterance.lang, rate: utterance.rate, pitch: utterance.pitch, volume: utterance.volume, category: "playback" });
          if (current === version) utterance.onend?.();
        }).catch(() => { if (current === version) utterance.onerror?.(); });
      },
    },
  } as unknown as SpeechPlatform);
}
