import { voiceInput } from "./voice-input.ts";

export function speechText(markdown: string) {
  return markdown.replace(/```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)/g, " Un bloc de code est disponible à l’écran. ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ").replace(/^[\s]*[>#*-]+\s*/gm, "").replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ").trim();
}
export function speechChunks(text: string, limit = 220): string[] {
  const chunks: string[] = [];
  let remaining = speechText(text);
  while (remaining.length > limit) {
    let end = remaining.lastIndexOf(" ", limit);
    if (end < limit / 2) end = limit;
    chunks.push(remaining.slice(0, end).trim()); remaining = remaining.slice(end).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}
interface SpeechPlatform { synth: SpeechSynthesis; Utterance: typeof SpeechSynthesisUtterance }
function browserPlatform(): SpeechPlatform | undefined {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return undefined;
  return { synth: window.speechSynthesis, Utterance: window.SpeechSynthesisUtterance };
}
export function supportsSpeech() { return !!browserPlatform(); }

export class SpeechPlayback {
  private activeId: string | null = null;
  private listeners = new Set<() => void>();
  private version = 0;
  private factory: () => SpeechPlatform | undefined;
  constructor(factory: () => SpeechPlatform | undefined = browserPlatform) { this.factory = factory; }
  getSnapshot = () => this.activeId;
  subscribe = (callback: () => void) => { this.listeners.add(callback); return () => { this.listeners.delete(callback); }; };
  private publish(id: string | null) { this.activeId = id; this.listeners.forEach(callback => callback()); }
  stop = () => {
    this.version++; this.publish(null);
    try { this.factory()?.synth.cancel(); } catch { /* No speech engine available. */ }
  };
  prepare = () => { try { this.factory()?.synth.resume(); } catch { /* Manual playback remains available. */ } };
  play(id: string, text: string, onError?: () => void, onDone?: () => void): boolean {
    voiceInput.abort();
    this.stop();
    const platform = this.factory();
    const chunks = speechChunks(text);
    if (!platform || !chunks.length) return false;
    const version = this.version;
    this.publish(id);
    let index = 0;
    const fail = () => { if (version !== this.version) return; this.stop(); onError?.(); };
    const next = () => {
      if (version !== this.version) return;
      if (index >= chunks.length) { this.publish(null); onDone?.(); return; }
      try {
        const utterance = new platform.Utterance(chunks[index++]);
        utterance.lang = "fr-FR"; utterance.rate = 1; utterance.pitch = 1;
        const voice = platform.synth.getVoices().find(voice => voice.lang.toLowerCase().startsWith("fr"));
        if (voice) utterance.voice = voice;
        utterance.onend = next; utterance.onerror = fail;
        platform.synth.speak(utterance);
      } catch { fail(); }
    };
    try { platform.synth.resume(); } catch { /* Some engines do not need resume. */ }
    next();
    return true;
  }
}
export const speechPlayback = new SpeechPlayback();
