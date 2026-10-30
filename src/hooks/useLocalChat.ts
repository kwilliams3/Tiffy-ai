import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { VoiceConversation } from "@/lib/voice-conversation";
import { voiceInput } from "@/lib/voice-input";
import { ChatStore } from "@/lib/chat-store";
import { loadReplyPreferences, loadAutoSpeak } from "@/lib/chat-preferences";
import { speechPlayback, supportsSpeech } from "@/lib/speech-playback";
import { toast } from "sonner";
import { browserReplyAlerts, deliverReplyAlerts, prepareReplySound } from "@/lib/response-alerts";
export type { Message, Conversation } from "@/lib/chat-store";

export function useLocalChat() {
  const [discussionError, setDiscussionError] = useState("");
  const [discussionTranscript, setDiscussionTranscript] = useState("");
  const discussionRef = useRef<VoiceConversation | null>(null);
  const [store] = useState(() => {
    let storage: Storage | undefined;
    try { storage = window.localStorage; } catch { /* Private browsing may deny storage. */ }
    const instance: ChatStore = new ChatStore({ storage, onComplete: id => {
      void deliverReplyAlerts(id, storage, browserReplyAlerts).catch(() => {});
      const reply = instance.getSnapshot().conversations.find(c => c.id === id)?.messages.at(-1);
      if (discussionRef.current?.getSnapshot() === "off" && reply?.role === "assistant" && document.visibilityState === "visible" && loadAutoSpeak(storage)) {
        speechPlayback.play(reply.id, reply.content, () => toast.info("Appuie sur « Écouter » pour lancer la réponse vocale."));
      }
    } });
    return instance;
  });
  const [discussion] = useState(() => new VoiceConversation({
    voice: voiceInput,
    ask: async text => {
      await store.sendMessage(text);
      const snapshot = store.getSnapshot();
      const reply = snapshot.conversations.find(c => c.id === snapshot.currentConversationId)?.messages.at(-1);
      if (reply?.status === "error") throw new Error(reply.error || "Impossible d’obtenir une réponse.");
      return reply?.role === "assistant" && reply.status === "complete" ? reply : undefined;
    },
    speak: (id, text, fail, done) => speechPlayback.play(id, text, fail, done),
    cancel: () => { speechPlayback.stop(); store.stopResponse(); },
    error: setDiscussionError,
    transcript: setDiscussionTranscript,
  }));
  discussionRef.current = discussion;
  const discussionState = useSyncExternalStore(discussion.subscribe, discussion.getSnapshot);
  useEffect(() => {
    const hide = () => { if (document.hidden) discussion.stop(); };
    document.addEventListener("visibilitychange", hide);
    return () => { document.removeEventListener("visibilitychange", hide); discussion.stop(); };
  }, [discussion]);
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
  const startDiscussion = () => {
    setDiscussionError(""); setDiscussionTranscript("");
    if (!supportsSpeech()) {
      discussion.pause(); setDiscussionError("La lecture vocale est indisponible dans ce navigateur. Essaie Chrome ou Safari à jour."); return;
    }
    speechPlayback.prepare(); discussion.start();
  };
  return {
    discussionState,
    discussionError, discussionTranscript,
    pauseDiscussion: discussion.pause,
    sendDiscussionTurn: discussion.sendTurn,
    resumeDiscussion: startDiscussion,
    toggleDiscussion: () => { if (discussion.getSnapshot() !== "off") discussion.stop(); else startDiscussion(); },
    ...state, messages: current?.messages || [], isLoading: !!state.activeMessageId, isLoadingConversations: false,
    sendMessage: (content: string) => { discussion.stop(); speechPlayback.stop(); speechPlayback.prepare(); unlockSound(); return store.sendMessage(content); },
    retryMessage: (id: string) => { discussion.stop(); speechPlayback.stop(); speechPlayback.prepare(); unlockSound(); return store.retryMessage(id); },
    editMessage: (id: string, content: string) => { discussion.stop(); speechPlayback.stop(); speechPlayback.prepare(); unlockSound(); return store.editMessage(id, content); },
    stopResponse: () => { discussion.stop(); speechPlayback.stop(); store.stopResponse(); },
    selectConversation: (id: string) => { discussion.stop(); speechPlayback.stop(); store.selectConversation(id); },
    startNewConversation: () => { discussion.stop(); speechPlayback.stop(); store.startNewConversation(); },
    deleteConversation: (id: string) => { discussion.stop(); speechPlayback.stop(); store.deleteConversation(id); }, renameConversation: store.renameConversation,
  };
}
