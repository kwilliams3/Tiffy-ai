import { Sparkles } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex gap-4 animate-fade-in">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground ai-glow shadow-md">
        <Sparkles className="h-4.5 w-4.5" />
      </div>
      <div className="message-bubble-ai flex items-center gap-1.5 px-5 py-4">
        <span className="h-2.5 w-2.5 rounded-full bg-primary/60 animate-typing-1" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary/60 animate-typing-2" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary/60 animate-typing-3" />
      </div>
    </div>
  );
}
