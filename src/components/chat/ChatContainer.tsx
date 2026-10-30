import { useRef, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Plus, Settings, ArrowUpRight, Feather, Lightbulb, Compass, Code2, Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { VoiceDiscussion } from "./VoiceDiscussion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { downloadConversations } from "@/lib/chat-export";
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
      <VoiceDiscussion onReplay={chat.replayDiscussion} pendingReply={chat.isLoading ? chat.messages.at(-1)?.content : undefined} onSendTurn={chat.sendDiscussionTurn} error={chat.discussionError} transcript={chat.discussionTranscript} state={chat.discussionState} onClose={chat.stopResponse} onPause={chat.pauseDiscussion} onResume={chat.resumeDiscussion} reply={chat.messages.filter(message => message.role === "assistant").at(-1)?.content} />
      <ConversationSidebar conversations={chat.conversations} currentConversationId={chat.currentConversationId}
        isLoading={chat.isLoadingConversations} isOpen={sidebarOpen} onClose={closeSidebar}
        onSelect={id => { chat.selectConversation(id); setSidebarOpen(false); }}
        onNew={() => { chat.startNewConversation(); setSidebarOpen(false); }} onDelete={chat.deleteConversation} onRename={chat.renameConversation} />
      <main className="chat-main">
        <header className="workspace-header">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Ouvrir les conversations" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
            <div className="header-mark"><Sparkles className="h-4 w-4" /></div>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{conversation?.title || "Un nouvel espace pour tes idées"}</p><p className="text-xs text-muted-foreground">{chat.banterMode ? "Mode taquin · à toi de jouer !" : "Avec Tiffy, avance à ton rythme."}</p></div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Exporter les conversations" disabled={!chat.conversations.length}><Download className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={!conversation} onSelect={() => conversation && downloadConversations([conversation], "md")}>Cette conversation en Markdown</DropdownMenuItem><DropdownMenuItem disabled={!conversation} onSelect={() => conversation && downloadConversations([conversation], "json")}>Cette conversation en JSON</DropdownMenuItem><DropdownMenuItem onSelect={() => downloadConversations(chat.conversations, "json")}>Tout l’historique en JSON</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
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
              {chat.messages.map((message, index) => <ChatMessage key={message.id} message={message} isBusy={chat.isLoading} canRetry={index === chat.messages.length - 1} onRetry={chat.retryMessage} onEdit={chat.editMessage} />)}
            </div>
          )}
          <div ref={endRef} />
        </div>
        <footer className="composer-footer"><ChatInput discussionState={chat.discussionState} onToggleDiscussion={chat.toggleDiscussion} onSend={chat.sendMessage} isLoading={chat.isLoading} onStop={chat.stopResponse} /></footer>
      </main>
    </div>
  );
}
