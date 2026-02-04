import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Plus, Settings } from "lucide-react";
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border/50 bg-card/80 backdrop-blur-sm px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <img src={tiffyLogo} alt="Tiffy" className="h-10 w-10 rounded-xl ai-glow" />
            <div>
              <h1 className="font-semibold text-foreground">Tiffy</h1>
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
              className="hidden md:flex"
            >
              <Plus className="h-4 w-4 mr-1" />
              Nouvelle
            </Button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
              className="text-muted-foreground hover:text-foreground"
              title="Paramètres"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-2xl space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                <img src={tiffyLogo} alt="Tiffy" className="h-20 w-20 mb-6 ai-glow rounded-2xl" />
                <h2 className="text-2xl font-semibold gradient-text mb-2">
                  Salut ! Je suis Tiffy 👋
                </h2>
                <p className="text-muted-foreground max-w-sm">
                  Pose-moi n'importe quelle question, je suis là pour t'aider !
                </p>
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
        <div className="border-t border-border/50 bg-card/80 backdrop-blur-sm px-4 py-4">
          <div className="mx-auto max-w-2xl">
            <ChatInput onSend={sendMessage} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
