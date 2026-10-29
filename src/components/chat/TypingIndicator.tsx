import { Sparkles } from "lucide-react";
export function TypingIndicator() {
  return <div className="flex items-center gap-3 animate-fade-in" role="status"><span className="message-avatar"><Sparkles className="h-4 w-4" /></span><div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-typing-1" /><span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-typing-2" /><span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-typing-3" /><span className="ml-2 text-xs text-muted-foreground">Tiffy réfléchit…</span></div></div>;
}
