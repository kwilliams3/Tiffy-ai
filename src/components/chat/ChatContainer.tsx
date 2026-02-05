import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Plus, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { ConversationSidebar } from "./ConversationSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import tiffyLogo from "@/assets/tiffy-logo.png";

export function ChatContainer() {
  const navigate = useNavigate();
  const {
    messages,
    conversations,
    currentConversationId,
    isLoading,
    isLoadingConversations,
    sendMessage,
    selectConversation,
    startNewConversation,
    deleteConversation,
    renameConversation,
  } = useChat();
  
  const { user, signOut } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-screen chat-container">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/3 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        isLoading={isLoadingConversations}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelect={(id) => {
          selectConversation(id);
          setSidebarOpen(false);
        }}
        onNew={() => {
          startNewConversation();
          setSidebarOpen(false);
        }}
        onDelete={deleteConversation}
        onRename={renameConversation}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="flex items-center justify-between glass-effect px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="relative">
              <img src={tiffyLogo} alt="Tiffy" className="h-11 w-11 rounded-xl ai-glow" />
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-accent rounded-full border-2 border-card" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground flex items-center gap-1.5">
                Tiffy
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </h1>
              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                {user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={startNewConversation}
              className="hidden md:flex gap-1.5 font-medium"
            >
              <Plus className="h-4 w-4 mr-1" />
              Nouvelle
            </Button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Paramètres"
            >
              <Settings className="h-4.5 w-4.5" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-8">
          <div className="mx-auto max-w-2xl space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
                <div className="relative mb-8">
                  <img src={tiffyLogo} alt="Tiffy" className="h-28 w-28 ai-glow rounded-3xl" />
                  <div className="absolute -top-2 -right-2 bg-gradient-to-br from-primary to-accent p-2 rounded-full shadow-lg">
                    <Sparkles className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold gradient-text mb-3">
                  Salut ! Je suis Tiffy
                </h2>
                <p className="text-muted-foreground max-w-sm text-lg mb-8">
                  Ton assistant IA personnel. Pose-moi n'importe quelle question !
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {["💡 Comment ça marche ?", "🎯 Aide-moi à planifier", "✨ Donne-moi des idées"].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => sendMessage(suggestion.replace(/^[^\s]+\s/, ""))}
                      className="px-4 py-2 rounded-full bg-muted/80 hover:bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 hover:shadow-md"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <TypingIndicator />
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="glass-effect px-4 py-4">
          <div className="mx-auto max-w-2xl relative">
            <ChatInput onSend={sendMessage} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
