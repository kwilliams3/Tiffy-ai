export interface RecognitionResult { 0: { transcript: string }; isFinal?: boolean }
export interface Recognizer {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
}
type Constructor = new () => Recognizer;
export function recognitionConstructor(): Constructor | undefined {
  if (typeof window === "undefined" || !window.isSecureContext) return undefined;
  const browser = window as unknown as { SpeechRecognition?: Constructor; webkitSpeechRecognition?: Constructor };
  return browser.SpeechRecognition || browser.webkitSpeechRecognition;
}
const errors: Record<string, string> = {
  "not-allowed": "Autorise le microphone dans les réglages du site de ton navigateur.",
  "service-not-allowed": "La dictée est bloquée par ce navigateur ou ses réglages.",
  "audio-capture": "Aucun microphone disponible. Vérifie qu’il est branché et accessible.",
  "no-speech": "Aucune parole détectée. Appuie sur le micro pour réessayer.",
  "network": "Le service de dictée n’est pas joignable. Vérifie ta connexion.",
};

export class VoiceInput {
  private active: { recognition: Recognizer; end: () => void; stopping: boolean } | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(privateFactory: () => Recognizer | undefined = () => { const Constructor = recognitionConstructor(); return Constructor ? new Constructor() : undefined; }) { this.factory = privateFactory; }
  private factory: () => Recognizer | undefined;
  start(onText: (text: string) => void, onError: (message: string) => void, onListening: (listening: boolean) => void) {
    if (this.active) return;
    let recognition: Recognizer | undefined;
    try { recognition = this.factory(); } catch { onError("Impossible d’ouvrir le microphone."); return; }
    if (!recognition) { onError("La dictée vocale n’est pas disponible dans ce navigateur."); return; }
    const session = { recognition, end: () => onListening(false), stopping: false };
    this.active = session;
    recognition.lang = "fr-FR"; recognition.continuous = true; recognition.interimResults = true;
    recognition.onresult = event => {
      if (this.active !== session) return;
      onText(Array.from(event.results, result => result[0]?.transcript || "").join(" ").trim());
    };
    recognition.onerror = event => {
      if (this.active !== session) return;
      if (event.error !== "aborted") onError(errors[event.error] || "La dictée a été interrompue. Tu peux réessayer.");
      this.abort();
    };
    recognition.onend = () => { if (this.active === session) this.finish(); };
    try {
      recognition.start();
      if (this.active !== session) return;
      onListening(true);
      this.timer = setTimeout(() => this.stop(), 60_000);
    } catch { this.abort(); onError("Impossible de démarrer la dictée. Réessaie depuis le bouton micro."); }
  }
  private finish() {
    const session = this.active;
    this.active = null; clearTimeout(this.timer);
    if (!session) return;
    session.recognition.onresult = null; session.recognition.onerror = null; session.recognition.onend = null;
    session.end();
  }
  stop = () => {
    const session = this.active;
    if (!session || session.stopping) return;
    session.stopping = true; clearTimeout(this.timer);
    // Keep accepting the final transcript before the recognition service ends.
    this.timer = setTimeout(() => this.abort(), 2000);
    try { session.recognition.stop(); } catch { this.abort(); }
  };
  abort = () => {
    const session = this.active;
    this.finish();
    try { session?.recognition.abort(); } catch { /* Already ended. */ }
  };
}
export const voiceInput = new VoiceInput();
