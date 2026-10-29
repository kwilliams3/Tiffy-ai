import { useState, useRef, useEffect } from "react";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";

interface Props { onSend: (message: string) => void; isLoading: boolean }
export function ChatInput({ onSend, isLoading }: Props) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submit = () => { if (input.trim() && !isLoading) { onSend(input.trim()); setInput(""); } };
  useEffect(() => { const el = textareaRef.current; if (el) { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 160)}px`; } }, [input]);
  return <div className="composer-wrap"><form className="composer" onSubmit={e => { e.preventDefault(); submit(); }}>
    <textarea ref={textareaRef} aria-label="Ton message à Tiffy" placeholder="Qu’as-tu en tête aujourd’hui ?" value={input} disabled={isLoading} rows={1} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }} />
    <div className="composer-toolbar"><span className="composer-label"><Sparkles className="h-3.5 w-3.5" />Un espace pour réfléchir ensemble</span><div className="flex items-center gap-3"><span className="composer-shortcut">Entrée ↵</span><button className="send-button" type="submit" disabled={!input.trim() || isLoading} aria-label={isLoading ? "Réponse en cours" : "Envoyer le message"}>{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-5 w-5" />}</button></div></div>
  </form><p className="composer-disclaimer">Tiffy peut se tromper. Garde un regard critique sur les informations importantes.</p></div>;
}
