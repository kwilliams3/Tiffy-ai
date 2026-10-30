import type { VoiceInput } from "./voice-input.ts";

export type DiscussionState = "off" | "listening" | "thinking" | "speaking";
interface Ports {
  voice: Pick<VoiceInput, "start" | "stop" | "abort">;
  ask: (text: string) => Promise<{ id: string; content: string } | undefined>;
  speak: (id: string, text: string, fail: () => void, done: () => void) => boolean;
  cancel: () => void;
  error: (message: string) => void;
}

// One microphone turn, one model reply, one spoken reply. Never listen to our own voice.
export class VoiceConversation {
  private state: DiscussionState = "off";
  private listeners = new Set<() => void>();
  private generation = 0;
  private silence: ReturnType<typeof setTimeout> | undefined;
  private ports: Ports;
  constructor(ports: Ports) { this.ports = ports; }
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private publish(state: DiscussionState) { this.state = state; this.listeners.forEach(fn => fn()); }
  stop = () => {
    this.generation++; clearTimeout(this.silence);
    this.publish("off"); this.ports.voice.abort(); this.ports.cancel();
  };
  start = () => { this.stop(); this.listen(this.generation); };
  private fail(message: string) { this.stop(); this.ports.error(message); }
  private listen(generation: number) {
    if (generation !== this.generation) return;
    let transcript = "";
    this.publish("listening");
    this.ports.voice.start(text => {
      transcript = text;
      clearTimeout(this.silence);
      if (text.trim()) this.silence = setTimeout(() => this.ports.voice.stop(), 1400);
    }, message => this.fail(message), listening => {
      if (listening || generation !== this.generation) return;
      clearTimeout(this.silence);
      if (!transcript.trim()) { this.fail("Aucune parole détectée. Relance le mode discussion pour réessayer."); return; }
      void this.reply(transcript.slice(0, 12000), generation);
    });
  }
  private async reply(text: string, generation: number) {
    this.publish("thinking");
    try {
      const reply = await this.ports.ask(text);
      if (generation !== this.generation) return;
      if (!reply?.content) { this.fail("La réponse n’a pas abouti. Tu peux relancer la discussion."); return; }
      this.publish("speaking");
      const accepted = this.ports.speak(reply.id, reply.content,
        () => { if (generation === this.generation) this.fail("Lecture vocale interrompue. Relance la discussion."); },
        () => { if (generation === this.generation) this.listen(generation); });
      if (!accepted && generation === this.generation) this.fail("La lecture vocale est indisponible dans ce navigateur.");
    } catch { if (generation === this.generation) this.fail("La discussion a été interrompue. Réessaie."); }
  }
}
