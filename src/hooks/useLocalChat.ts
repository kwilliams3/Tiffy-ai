import { useEffect, useState, useSyncExternalStore } from "react";
import { ChatStore } from "@/lib/chat-store";
import { loadReplyPreferences, loadAutoSpeak } from "@/lib/chat-preferences";
import { speechPlayback } from "@/lib/speech-playback";
import { toast } from "sonner";
import { browserReplyAlerts, deliverReplyAlerts, prepareReplySound } from "@/lib/response-alerts";
export type { Message, Conversation } from "@/lib/chat-store";

export function useLocalChat() {
  const [store] = useState(() => {
    let storage: Storage | undefined;
    try { storage = window.localStorage; } catch { /* Private browsing may deny storage. */ }
    const instance: ChatStore = new ChatStore({ storage, onComplete: id => {
      void deliverReplyAlerts(id, storage, browserReplyAlerts).catch(() => {});
      const reply = instance.getSnapshot().conversations.find(c => c.id === id)?.messages.at(-1);
      if (reply?.role === "assistant" && document.visibilityState === "visible" && loadAutoSpeak(storage)) {
        speechPlayback.play(reply.id, reply.content, () => toast.info("Appuie sur « Écouter » pour lancer la réponse vocale."));
      }
    } });
    return instance;
  });
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => () => { store.stopResponse(); speechPlayback.stop(); }, [store]);
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
    sendMessage: (content: string) => { speechPlayback.stop(); speechPlayback.prepare(); unlockSound(); return store.sendMessage(content); },
    retryMessage: (id: string) => { speechPlayback.stop(); speechPlayback.prepare(); unlockSound(); return store.retryMessage(id); },
    editMessage: (id: string, content: string) => { speechPlayback.stop(); speechPlayback.prepare(); unlockSound(); return store.editMessage(id, content); },
    stopResponse: () => { speechPlayback.stop(); store.stopResponse(); },
    selectConversation: (id: string) => { speechPlayback.stop(); store.selectConversation(id); },
    startNewConversation: () => { speechPlayback.stop(); store.startNewConversation(); },
    deleteConversation: (id: string) => { speechPlayback.stop(); store.deleteConversation(id); }, renameConversation: store.renameConversation,
  };
}
