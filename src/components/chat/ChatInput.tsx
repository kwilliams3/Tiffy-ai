import { useState, useRef, useEffect } from "react";
import { ArrowUp, Square, Sparkles } from "lucide-react";

interface Props { onSend: (message: string) => void; isLoading: boolean; onStop: () => void }
export function ChatInput({ onSend, isLoading, onStop }: Props) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submit = () => { if (input.trim() && !isLoading) { onSend(input.trim()); setInput(""); } };
  useEffect(() => { const el = textareaRef.current; if (el) { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 160)}px`; } }, [input]);
  return <div className="composer-wrap"><form className="composer" onSubmit={e => { e.preventDefault(); submit(); }}>
    <textarea ref={textareaRef} aria-label="Ton message à Tiffy" placeholder="Qu’as-tu en tête aujourd’hui ?" value={input} disabled={isLoading} maxLength={12000} rows={1} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }} />
    <div className="composer-toolbar"><span className="composer-label"><Sparkles className="h-3.5 w-3.5" />{isLoading ? "Tiffy prépare ta réponse…" : "Un espace pour réfléchir ensemble"}</span><div className="flex items-center gap-3"><span className="composer-shortcut">{isLoading ? "Arrêter →" : "Entrée ↵"}</span>{isLoading ? <button className="send-button stop-button" type="button" onClick={onStop} aria-label="Arrêter la réponse"><Square className="h-3.5 w-3.5 fill-current" /></button> : <button className="send-button" type="submit" disabled={!input.trim()} aria-label="Envoyer le message"><ArrowUp className="h-5 w-5" /></button>}</div></div>
  </form><p className="composer-disclaimer">Tiffy peut se tromper. Garde un regard critique sur les informations importantes.</p></div>;
}
