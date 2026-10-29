import { useEffect, useState, useSyncExternalStore } from "react";
import { ChatStore } from "@/lib/chat-store";
export type { Message, Conversation } from "@/lib/chat-store";

export function useLocalChat() {
  const [store] = useState(() => {
    let storage: Storage | undefined;
    try { storage = window.localStorage; } catch { /* Private browsing may deny storage. */ }
    return new ChatStore({ storage });
  });
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => () => store.stopResponse(), [store]);
  const current = state.conversations.find(c => c.id === state.currentConversationId);
  return {
    ...state, messages: current?.messages || [], isLoading: !!state.activeMessageId, isLoadingConversations: false,
    sendMessage: store.sendMessage, retryMessage: store.retryMessage, editMessage: store.editMessage,
    stopResponse: store.stopResponse, selectConversation: store.selectConversation, startNewConversation: store.startNewConversation,
    deleteConversation: store.deleteConversation, renameConversation: store.renameConversation,
  };
}
