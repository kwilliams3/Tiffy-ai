import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = "tiffy_conversations";
const CHAT_URL = "/api/chat";

function loadFromStorage(): Conversation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveToStorage(conversations: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
}

export function useLocalChat() {
  const [conversations, setConversations] = useState<Conversation[]>(() => loadFromStorage());
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentConversation = conversations.find((c) => c.id === currentConversationId);
  const messages = currentConversation?.messages || [];

  // Persist whenever conversations change
  useEffect(() => {
    saveToStorage(conversations);
  }, [conversations]);

  const updateConversation = (id: string, updater: (conv: Conversation) => Conversation) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? updater(c) : c))
    );
  };

  const createConversation = (firstMessage: string): string => {
    const title =
      firstMessage.length > 50 ? firstMessage.substring(0, 47) + "..." : firstMessage;

    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      title,
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setConversations((prev) => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    return newConversation.id;
  };

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
      };

      let conversationId = currentConversationId;

      if (!conversationId) {
        conversationId = createConversation(content.trim());
      }

      // Add user message
      updateConversation(conversationId, (conv) => ({
        ...conv,
        messages: [...conv.messages, userMessage],
        updated_at: new Date().toISOString(),
      }));

      // Move conversation to top
      setConversations((prev) => {
        const updated = prev.find((c) => c.id === conversationId);
        if (!updated) return prev;
        return [updated, ...prev.filter((c) => c.id !== conversationId)];
      });

      setIsLoading(true);

      let assistantContent = "";

      const updateAssistant = (chunk: string) => {
        assistantContent += chunk;
        updateConversation(conversationId!, (conv) => {
          const lastMsg = conv.messages[conv.messages.length - 1];
          if (lastMsg?.role === "assistant") {
            return {
              ...conv,
              messages: conv.messages.map((m, i) =>
                i === conv.messages.length - 1 ? { ...m, content: assistantContent } : m
              ),
            };
          }
          return {
            ...conv,
            messages: [
              ...conv.messages,
              { id: crypto.randomUUID(), role: "assistant", content: assistantContent },
            ],
          };
        });
      };

      try {
        const currentMessages = conversations.find((c) => c.id === conversationId)?.messages || [];
        
        const response = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...currentMessages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erreur de connexion");
        }

        if (!response.body) {
          throw new Error("Pas de réponse");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const deltaContent = parsed.choices?.[0]?.delta?.content;
              if (deltaContent) updateAssistant(deltaContent);
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }
      } catch (error) {
        console.error("Chat error:", error);
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue");
        // Remove user message on error
        updateConversation(conversationId, (conv) => ({
          ...conv,
          messages: conv.messages.filter((m) => m.id !== userMessage.id),
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [conversations, isLoading, currentConversationId]
  );

  const selectConversation = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId);
  }, []);

  const startNewConversation = useCallback(() => {
    setCurrentConversationId(null);
  }, []);

  const deleteConversation = useCallback(
    (conversationId: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));

      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
      }

      toast.success("Conversation supprimée");
    },
    [currentConversationId]
  );

  const renameConversation = useCallback((conversationId: string, newTitle: string) => {
    updateConversation(conversationId, (conv) => ({ ...conv, title: newTitle }));
    toast.success("Conversation renommée");
  }, []);

  return {
    messages,
    conversations: conversations.map(({ id, title, created_at, updated_at }) => ({
      id,
      title,
      created_at,
      updated_at,
    })),
    currentConversationId,
    isLoading,
    isLoadingConversations: false,
    sendMessage,
    selectConversation,
    startNewConversation,
    deleteConversation,
    renameConversation,
  };
}
