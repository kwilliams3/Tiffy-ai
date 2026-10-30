import { isValidElement, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Copy, Sparkles, Pencil, RotateCcw, AlertCircle, Square, Volume2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import type { Message } from "@/hooks/useLocalChat";
import { CodeBlock } from "./CodeBlock";
import { TypingIndicator } from "./TypingIndicator";
import { SearchSuggestions } from "./SearchSuggestions";
import { speechPlayback, supportsSpeech } from "@/lib/speech-playback";

interface Props { message: Message; isBusy: boolean; canRetry: boolean; onRetry: (id: string) => void; onEdit: (id: string, content: string) => void }
export function ChatMessage({ message, isBusy, canRetry, onRetry, onEdit }: Props) {
  const isUser = message.role === "user";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const speakingId = useSyncExternalStore(speechPlayback.subscribe, speechPlayback.getSnapshot);
  const listen = () => {
    if (speakingId === message.id) { speechPlayback.stop(); return; }
    if (!speechPlayback.play(message.id, message.content, () => toast.info("Lecture vocale indisponible. Vérifie les réglages audio du navigateur."))) toast.info("La lecture vocale n’est pas disponible pour ce texte.");
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(message.content); toast.success("Réponse copiée !"); }
    catch { toast.error("La copie n’est pas disponible dans ce navigateur."); }
  };
  if (!isUser && message.status === "streaming" && !message.content) return <TypingIndicator />;
  return <article className={cn("chat-message animate-slide-up", isUser && "is-user")}>
    {!isUser && <div className="message-avatar" aria-hidden="true"><Sparkles className="h-4 w-4" /></div>}
    <div className="message-content"><div className={cn("message-author", isUser && "text-right")}>{isUser ? "Toi" : "Tiffy"}{!isUser && <span>Un coup de main pour avancer</span>}</div>
      {editing ? <form className="message-edit" onSubmit={e => { e.preventDefault(); if (!draft.trim() || isBusy) return; setEditing(false); onEdit(message.id, draft); }}>
        <textarea aria-label="Modifier ton message" autoFocus value={draft} maxLength={12000} onChange={e => setDraft(e.target.value)} rows={4} disabled={isBusy} onKeyDown={e => { if (e.key === "Escape") setEditing(false); }} />
        <p>La nouvelle réponse remplacera les messages qui suivent.</p><div><button type="button" onClick={() => setEditing(false)}>Annuler</button><button type="submit" disabled={!draft.trim() || isBusy}>Modifier et relancer</button></div>
      </form> : <>
        {message.content && <div className={isUser ? "message-bubble-user" : "message-bubble-ai"}>{isUser ? <p className="whitespace-pre-wrap break-words text-sm leading-7">{message.content}</p> : <div className="markdown-body"><ReactMarkdown components={{
          a: ({ children, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>,
          pre: ({ children }) => {
            if (!isValidElement<{ children?: ReactNode; className?: string }>(children)) return <pre>{children}</pre>;
            return <CodeBlock code={String(children.props.children ?? "").replace(/\n$/, "")} language={/language-([\w+-]+)/.exec(children.props.className || "")?.[1] || ""} />;
          },
        }}>{message.content}</ReactMarkdown></div>}</div>}
        {message.status === "error" && <div className="response-error" role="alert"><AlertCircle className="h-4 w-4 shrink-0" /><p>{message.error || "La réponse a été interrompue. Réessaie."}</p></div>}
        {message.status === "stopped" && <div className="response-stopped"><Square className="h-3 w-3" />Réponse arrêtée. {message.content ? "Le texte reçu est conservé." : "Ton message est conservé."}</div>}
        {!isUser && <SearchSuggestions html={message.searchSuggestions} />}
        <div className={cn("message-actions", isUser && "justify-end")}>
          {isUser ? <button disabled={isBusy} onClick={() => { speechPlayback.stop(); setDraft(message.content); setEditing(true); }}><Pencil className="h-3 w-3" />Modifier</button> : <>
            {message.content && <button onClick={copy} aria-label="Copier la réponse de Tiffy"><Copy className="h-3 w-3" />Copier</button>}
            {message.content && message.status !== "streaming" && supportsSpeech() && <button onClick={listen} aria-label={speakingId === message.id ? "Arrêter la lecture vocale" : "Écouter la réponse"}>{speakingId === message.id ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}{speakingId === message.id ? "Arrêter la lecture" : "Écouter"}</button>}
            {canRetry && <button disabled={isBusy} onClick={() => onRetry(message.id)}><RotateCcw className="h-3 w-3" />{message.status === "error" || message.status === "stopped" ? "Réessayer" : "Nouvelle réponse"}</button>}
          </>}
        </div>
      </>}
    </div>
  </article>;
}
