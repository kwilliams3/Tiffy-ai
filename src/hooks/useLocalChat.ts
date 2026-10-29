import { useEffect, useState, useSyncExternalStore } from "react";
import { ChatStore } from "@/lib/chat-store";
import { loadReplyPreferences } from "@/lib/chat-preferences";
import { browserReplyAlerts, deliverReplyAlerts, prepareReplySound } from "@/lib/response-alerts";
export type { Message, Conversation } from "@/lib/chat-store";

export function useLocalChat() {
  const [store] = useState(() => {
    let storage: Storage | undefined;
    try { storage = window.localStorage; } catch { /* Private browsing may deny storage. */ }
    return new ChatStore({ storage, onComplete: id => { void deliverReplyAlerts(id, storage, browserReplyAlerts).catch(() => {}); } });
  });
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => () => store.stopResponse(), [store]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("conversation");
    if (id && store.getSnapshot().conversations.some(c => c.id === id)) store.selectConversation(id);
  }, [store]);
  const unlockSound = () => {
    try { if (loadReplyPreferences(window.localStorage).sounds) void prepareReplySound(); } catch { /* Chat works without audio. */ }
  };
  const current = state.conversations.find(c => c.id === state.currentConversationId);
  return {
    ...state, messages: current?.messages || [], isLoading: !!state.activeMessageId, isLoadingConversations: false,
    sendMessage: (content: string) => { unlockSound(); return store.sendMessage(content); },
    retryMessage: (id: string) => { unlockSound(); return store.retryMessage(id); },
    editMessage: (id: string, content: string) => { unlockSound(); return store.editMessage(id, content); },
    stopResponse: store.stopResponse, selectConversation: store.selectConversation, startNewConversation: store.startNewConversation,
    deleteConversation: store.deleteConversation, renameConversation: store.renameConversation,
  };
}
