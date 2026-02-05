import { cn } from "@/lib/utils";
import { Bot, User, Sparkles } from "lucide-react";
import type { Message } from "@/hooks/useChat";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-4 animate-slide-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md",
          isUser
            ? "bg-gradient-to-br from-primary/80 to-primary text-primary-foreground"
            : "bg-gradient-to-br from-primary to-accent text-primary-foreground ai-glow"
        )}
      >
        {isUser ? <User className="h-4.5 w-4.5" /> : <Sparkles className="h-4.5 w-4.5" />}
      </div>
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap",
          isUser ? "message-bubble-user" : "message-bubble-ai"
        )}
      >
        <p className={cn(
          "text-sm leading-relaxed",
          isUser ? "text-primary-foreground" : "text-foreground"
        )}>{message.content}</p>
      </div>
    </div>
  );
}
