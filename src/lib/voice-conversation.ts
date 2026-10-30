import type { VoiceInput } from "./voice-input.ts";

export type DiscussionState = "off" | "paused" | "listening" | "thinking" | "speaking";
interface Ports {
  voice: Pick<VoiceInput, "start" | "stop" | "abort">;
  ask: (text: string) => Promise<{ id: string; content: string } | undefined>;
  speak: (id: string, text: string, fail: () => void, done: () => void) => boolean;
  cancel: () => void;
  error: (message: string) => void;
  transcript?: (text: string) => void;
}

// One microphone turn, one model reply, one spoken reply. Never listen to our own voice.
export class VoiceConversation {
  private state: DiscussionState = "off";
  private listeners = new Set<() => void>();
  private generation = 0;
  private silence: ReturnType<typeof setTimeout> | undefined;
  private replyDeadline: ReturnType<typeof setTimeout> | undefined;
  private ports: Ports;
  constructor(ports: Ports) { this.ports = ports; }
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private publish(state: DiscussionState) { this.state = state; this.listeners.forEach(fn => fn()); }
  stop = () => {
    this.generation++; clearTimeout(this.silence); clearTimeout(this.replyDeadline);
    this.publish("off"); this.ports.voice.abort(); this.ports.cancel();
  };
  start = () => { this.stop(); this.listen(this.generation); };
  pause = () => { this.stop(); this.publish("paused"); };
  sendTurn = () => { if (this.state === "listening") this.ports.voice.stop(); };
  replay = (reply: { id: string; content: string }) => {
    this.stop(); this.speakReply(reply, this.generation);
  };
  private speakReply(reply: { id: string; content: string }, generation: number) {
    this.publish("speaking");
    const accepted = this.ports.speak(reply.id, reply.content,
      () => { if (generation === this.generation) this.fail("La voix n’a pas démarré ou a été interrompue. Appuie sur « Écouter la réponse » pour relancer le son, et vérifie le volume de ton appareil."); },
      () => { if (generation === this.generation) this.listen(generation); });
    if (!accepted && generation === this.generation) this.fail("La lecture vocale est indisponible dans ce navigateur.");
  }
  private fail(message: string) { this.pause(); this.ports.error(message); }
  private listen(generation: number) {
    if (generation !== this.generation) return;
    let transcript = "";
    this.ports.transcript?.("");
    this.publish("listening");
    this.ports.voice.start(text => {
      if (generation !== this.generation) return;
      transcript = text;
      this.ports.transcript?.(text);
      clearTimeout(this.silence);
      if (text.trim()) this.silence = setTimeout(() => this.ports.voice.stop(), 1400);
    }, message => this.fail(message), listening => {
      if (listening || generation !== this.generation || this.state !== "listening") return;
      clearTimeout(this.silence);
      if (!transcript.trim()) { this.fail("Aucune parole détectée. Relance le mode discussion pour réessayer."); return; }
      void this.reply(transcript.slice(0, 12000), generation);
    }, { continuous: false });
  }
  private async reply(text: string, generation: number) {
    this.publish("thinking");
    const deadline = setTimeout(() => {
      if (generation === this.generation) this.fail("Tiffy met trop de temps à répondre. Vérifie ta connexion et réessaie.");
    }, 50_000);
    this.replyDeadline = deadline;
    try {
      const reply = await this.ports.ask(text);
      if (generation !== this.generation) return;
      clearTimeout(deadline);
      if (!reply?.content) { this.fail("La réponse n’a pas abouti. Tu peux relancer la discussion."); return; }
      this.speakReply(reply, generation);
    } catch (error) { if (generation === this.generation) this.fail(error instanceof Error ? error.message : "La discussion a été interrompue. Réessaie."); }
    finally { clearTimeout(deadline); }
  }
}
