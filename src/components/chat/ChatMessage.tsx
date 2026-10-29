import { cn } from "@/lib/utils";
import { Copy, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import type { Message } from "@/hooks/useLocalChat";

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const copy = async () => {
    try { await navigator.clipboard.writeText(message.content); toast.success("Réponse copiée !"); }
    catch { toast.error("La copie n’est pas disponible dans ce navigateur."); }
  };
  return <article className={cn("chat-message animate-slide-up", isUser && "is-user")}>
    {!isUser && <div className="message-avatar" aria-hidden="true"><Sparkles className="h-4 w-4" /></div>}
    <div className="message-content"><div className={cn("message-author", isUser && "text-right")}>{isUser ? "Toi" : "Tiffy"}{!isUser && <span>Un coup de main pour avancer</span>}</div>
      <div className={isUser ? "message-bubble-user" : "message-bubble-ai"}>{isUser ? <p className="whitespace-pre-wrap break-words text-sm leading-7">{message.content}</p> : <div className="markdown-body"><ReactMarkdown components={{ a: ({ children, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer">{children}</a> }}>{message.content}</ReactMarkdown></div>}</div>
      {!isUser && <button onClick={copy} className="copy-response" aria-label="Copier la réponse de Tiffy"><Copy className="h-3 w-3" />Copier</button>}
    </div>
  </article>;
}
