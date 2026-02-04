import { Bot } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground ai-glow">
        <Bot className="h-4 w-4" />
      </div>
      <div className="message-bubble-ai flex items-center gap-1 px-5">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-typing-1" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-typing-2" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-typing-3" />
      </div>
    </div>
  );
}
