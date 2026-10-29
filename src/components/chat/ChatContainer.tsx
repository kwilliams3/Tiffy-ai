import { useRef, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Plus, Settings, ArrowUpRight, Feather, Lightbulb, Compass, Code2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { ConversationSidebar } from "./ConversationSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocalChat } from "@/hooks/useLocalChat";

const suggestions = [
  { icon: Feather, title: "Trouver les bons mots", text: "Un texte qui fait la différence.", prompt: "Aide-moi à rédiger un texte. Pose-moi des questions pour comprendre mon besoin.", color: "peach" },
  { icon: Lightbulb, title: "Faire naître une idée", text: "Un peu d’inspiration pour démarrer.", prompt: "Propose-moi des idées créatives pour un nouveau projet.", color: "sage" },
  { icon: Compass, title: "Y voir plus clair", text: "Un plan simple pour avancer.", prompt: "Aide-moi à organiser ma semaine et mes priorités.", color: "lavender" },
  { icon: Code2, title: "Comprendre & créer", text: "De la curiosité à la pratique.", prompt: "Explique-moi un concept de programmation avec un exemple simple.", color: "sand" },
];

export function ChatContainer() {
  const navigate = useNavigate();
  const chat = useLocalChat();
  const endRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const conversation = chat.conversations.find(c => c.id === chat.currentConversationId);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }, [chat.messages]);

  return (
    <div className="app-shell">
      <ConversationSidebar conversations={chat.conversations} currentConversationId={chat.currentConversationId}
        isLoading={chat.isLoadingConversations} isOpen={sidebarOpen} onClose={closeSidebar}
        onSelect={id => { chat.selectConversation(id); setSidebarOpen(false); }}
        onNew={() => { chat.startNewConversation(); setSidebarOpen(false); }} onDelete={chat.deleteConversation} onRename={chat.renameConversation} />
      <main className="chat-main">
        <header className="workspace-header">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Ouvrir les conversations" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
            <div className="header-mark"><Sparkles className="h-4 w-4" /></div>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{conversation?.title || "Un nouvel espace pour tes idées"}</p><p className="text-xs text-muted-foreground">Avec Tiffy, avance à ton rythme.</p></div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Nouvelle conversation" onClick={chat.startNewConversation}><Plus className="h-4 w-4" /></Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" aria-label="Paramètres" onClick={() => navigate("/settings")}><Settings className="h-4 w-4" /></Button>
          </div>
        </header>
        <div className="chat-scroll">
          {chat.messages.length === 0 ? (
            <section className="welcome animate-slide-up">
              <div className="welcome-kicker"><span className="tiny-star">✳</span> TON QUOTIDIEN, UN PEU PLUS SIMPLE</div>
              <div className="welcome-emblem" aria-hidden="true"><img src="/tiffy-logo.svg" alt="" className="h-full w-full rounded-[20px]" /></div>
              <h1>Les grandes idées<br />commencent par <em>un bonjour.</em></h1>
              <p className="welcome-description">Une question, une idée, une envie de créer ?<br className="hidden sm:block" /> Je suis Tiffy. Réfléchissons ensemble.</p>
              <div className="suggestion-grid">
                {suggestions.map(({ icon: Icon, title, text, prompt, color }) => (
                  <button key={title} className={`suggestion-card ${color}`} disabled={chat.isLoading} onClick={() => chat.sendMessage(prompt)}>
                    <div className="flex items-center justify-between"><span className="suggestion-icon"><Icon className="h-5 w-5" /></span><ArrowUpRight className="suggestion-arrow h-4 w-4" /></div>
                    <h2>{title}</h2><p>{text}</p>
                  </button>
                ))}
              </div>
              <p className="welcome-note">Pas besoin d’avoir les mots parfaits. Commence simplement.</p>
            </section>
          ) : (
            <div className="message-list" role="log" aria-label="Messages de la conversation" aria-busy={chat.isLoading}>
              <div className="conversation-start"><span />Le début d’une bonne conversation<span /></div>
              {chat.messages.map(message => <ChatMessage key={message.id} message={message} />)}
              {chat.isLoading && chat.messages.at(-1)?.role === "user" && <TypingIndicator />}
            </div>
          )}
          <div ref={endRef} />
        </div>
        <footer className="composer-footer"><ChatInput onSend={chat.sendMessage} isLoading={chat.isLoading} /></footer>
      </main>
    </div>
  );
}
