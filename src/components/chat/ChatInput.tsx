import { useState, useRef, useEffect } from "react";
import { ArrowUp, Square, Sparkles, Mic, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { voiceInput as voice, recognitionConstructor } from "@/lib/voice-input";
import { speechPlayback, supportsSpeech } from "@/lib/speech-playback";
import { loadAutoSpeak, saveAutoSpeak } from "@/lib/chat-preferences";

import type { DiscussionState } from "@/lib/voice-conversation";

interface Props { discussionState: DiscussionState; onToggleDiscussion: () => void; onSend: (message: string) => void; isLoading: boolean; onStop: () => void }
export function ChatInput({ onSend, isLoading, onStop, discussionState, onToggleDiscussion }: Props) {
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(() => { try { return loadAutoSpeak(window.localStorage); } catch { return false; } });
  const dictationSupported = !!recognitionConstructor();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submit = () => { if (input.trim() && !isLoading && !listening && discussionState === "off") { onSend(input.trim()); setInput(""); } };
  useEffect(() => () => voice.abort(), [voice]);
  useEffect(() => { if (isLoading && discussionState === "off") voice.abort(); }, [isLoading, voice, discussionState]);
  const dictate = () => {
    if (listening) { voice.stop(); return; }
    speechPlayback.stop();
    const prefix = input.trimEnd();
    voice.start(text => setInput((prefix + (prefix && text ? " " : "") + text).slice(0, 12000)), message => toast.info(message), setListening);
  };
  const toggleVoice = () => {
    try {
      saveAutoSpeak(window.localStorage, !autoSpeak);
      if (!autoSpeak) speechPlayback.prepare(); else speechPlayback.stop();
      setAutoSpeak(!autoSpeak);
      toast.success(!autoSpeak ? "Tiffy lira ses prochaines réponses à voix haute." : "Lecture automatique désactivée.");
    } catch { toast.error("Impossible d’enregistrer ce réglage."); }
  };
  useEffect(() => { const el = textareaRef.current; if (el) { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 160)}px`; } }, [input]);
  return <div className="composer-wrap"><form className="composer" onSubmit={e => { e.preventDefault(); submit(); }}>
    <div className="discussion-bar"><button type="button" className={`voice-control ${discussionState !== "off" ? "enabled" : ""}`} aria-pressed={discussionState !== "off"} disabled={!dictationSupported || !supportsSpeech() || (isLoading && discussionState === "off")} onClick={() => { voice.abort(); onToggleDiscussion(); }}>{discussionState === "off" ? "Discussion vocale" : "Quitter la discussion"}</button><span role="status">{({ paused: "Micro en pause", off: "Parle et laisse Tiffy te répondre.", listening: "Je t’écoute…", thinking: "Tiffy réfléchit…", speaking: "Tiffy te répond…" })[discussionState]}</span></div>
    <textarea ref={textareaRef} aria-label="Ton message à Tiffy" placeholder="Écris ou dicte ton message…" value={input} disabled={isLoading || listening || discussionState !== "off"} maxLength={12000} rows={1} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }} />
    <div className="composer-toolbar"><span className="composer-label"><Sparkles className="h-3.5 w-3.5" />{listening ? "Je t’écoute… arrête le micro pour relire." : isLoading ? "Tiffy prépare ta réponse…" : "À l’écrit ou à voix haute"}</span><div className="flex items-center gap-2"><button type="button" className={`voice-control ${autoSpeak ? "enabled" : ""}`} aria-label="Réponses vocales automatiques" aria-pressed={autoSpeak} disabled={!supportsSpeech() || discussionState !== "off"} title={autoSpeak ? "Désactiver les réponses vocales" : "Activer les réponses vocales"} onClick={toggleVoice}>{autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button><button type="button" className={`voice-control ${listening ? "is-listening" : ""}`} disabled={isLoading || discussionState !== "off" || !dictationSupported} aria-pressed={listening} aria-label={listening ? "Arrêter la dictée" : "Dicter un message"} title={dictationSupported ? "Dicter puis relire avant d’envoyer" : "Dictée non disponible dans ce navigateur"} onClick={dictate}>{listening ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}</button>{isLoading ? <button className="send-button stop-button" type="button" onClick={onStop} aria-label="Arrêter la réponse"><Square className="h-3.5 w-3.5 fill-current" /></button> : <button className="send-button" type="submit" disabled={!input.trim() || listening || discussionState !== "off"} aria-label="Envoyer le message"><ArrowUp className="h-5 w-5" /></button>}</div></div>
    {listening && <p className="voice-hint" role="status">Micro actif · ton message sera transcrit en texte, puis tu pourras l’envoyer.</p>}
    {!dictationSupported && <p className="voice-hint">Dictée indisponible ici. Essaie un navigateur compatible comme Chrome.</p>}
  </form><p className="composer-disclaimer">Tiffy peut se tromper. Garde un regard critique sur les informations importantes.</p></div>;
}
