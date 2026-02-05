import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-end gap-3 rounded-2xl border border-border/50 bg-card p-3 shadow-xl">
        <div className="hidden sm:flex items-center justify-center h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pose ta question à Tiffy..."
          disabled={isLoading}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent px-2 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50",
            "min-h-[44px] max-h-[150px] leading-relaxed"
          )}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isLoading}
          className={cn(
            "h-11 w-11 shrink-0 rounded-xl transition-all duration-200",
            input.trim()
              ? "bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-105"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Send className="h-4.5 w-4.5" />
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-3">
        Tiffy utilise l'IA pour t'aider. Vérifie les informations importantes.
      </p>
    </form>
  );
}
