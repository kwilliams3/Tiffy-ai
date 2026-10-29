import { readChatStream } from "./chat-stream.ts";
import { loadBanterMode } from "./chat-preferences.ts";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "streaming" | "complete" | "stopped" | "error";
  error?: string;
}
export interface Conversation { id: string; title: string; messages: Message[]; created_at: string; updated_at: string }
interface Snapshot { conversations: Conversation[]; currentConversationId: string | null; activeMessageId: string | null; banterMode: boolean }
type StorageLike = Pick<Storage, "getItem" | "setItem">;
const key = "tiffy_conversations";

export function loadConversations(storage?: StorageLike): Conversation[] {
  try {
    const data: unknown = JSON.parse(storage?.getItem(key) || "[]");
    if (!Array.isArray(data)) return [];
    return data.filter(c => c && typeof c.id === "string" && typeof c.title === "string" && Array.isArray(c.messages)
      && typeof c.created_at === "string" && typeof c.updated_at === "string").map(c => ({
        ...c,
        messages: c.messages.filter((m: Message) => m && typeof m.id === "string" && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
          .map((m: Message) => m.status === "streaming" ? { ...m, status: "stopped" } : m),
      }));
  } catch { return []; }
}

export class ChatStore {
  private snapshot: Snapshot;
  private listeners = new Set<() => void>();
  private active: { controller: AbortController; conversationId: string; messageId: string } | null = null;
  private fetcher: typeof fetch;
  private storage?: StorageLike;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private onComplete?: (conversationId: string) => void;
  constructor(options: { fetcher?: typeof fetch; storage?: StorageLike; onComplete?: (conversationId: string) => void } = {}) {
    // Browser-native fetch must keep Window as its receiver, not this ChatStore.
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
    this.storage = options.storage;
    this.onComplete = options.onComplete;
    this.snapshot = { conversations: loadConversations(options.storage), currentConversationId: null, activeMessageId: null, banterMode: loadBanterMode(options.storage) };
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private save = () => {
    clearTimeout(this.saveTimer);
    try { this.storage?.setItem(key, JSON.stringify(this.snapshot.conversations)); }
    catch { /* The session remains usable when storage is full or unavailable. */ }
  };
  private publish(patch: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    if (this.active) {
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(this.save, 200);
    } else this.save();
    this.listeners.forEach(listener => listener());
  }
  private update(id: string, change: (conversation: Conversation) => Conversation) {
    this.publish({ conversations: this.snapshot.conversations.map(c => c.id === id ? change(c) : c) });
  }
  private async run(conversationId: string, prefix: Message[]) {
    if (this.active) return;
    const messageId = crypto.randomUUID();
    const run = { controller: new AbortController(), conversationId, messageId };
    const banterMode = loadBanterMode(this.storage);
    this.active = run;
    const now = new Date().toISOString();
    const conversation = this.snapshot.conversations.find(c => c.id === conversationId);
    if (!conversation) { this.active = null; return; }
    this.publish({ activeMessageId: messageId, banterMode, conversations: [
      { ...conversation, updated_at: now, messages: [...prefix, { id: messageId, role: "assistant", content: "", status: "streaming" }] },
      ...this.snapshot.conversations.filter(c => c.id !== conversationId),
    ] });
    const changeMessage = (patch: Partial<Message>) => {
      if (this.active !== run) return;
      this.update(conversationId, c => ({ ...c, messages: c.messages.map(m => m.id === messageId ? { ...m, ...patch } : m) }));
    };
    let content = "";
    let completed = false;
    try {
      // Keep the full local history while bounding the context sent to Google.
      const outgoing = prefix.filter(m => m.content.trim()).slice(-40).map((m, index, all) => ({
        ...m, content: index < all.length - 1 ? m.content.slice(0, 12_000) : m.content,
      }));
      const payload = () => JSON.stringify({ messages: outgoing.map(({ role, content }) => ({ role, content })), banterMode });
      while (outgoing.length > 1 && (outgoing[0].role !== "user" || outgoing.reduce((n, m) => n + m.content.length, 0) > 40_000 || new TextEncoder().encode(payload()).length > 60_000)) outgoing.shift();
      const response = await this.fetcher("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: run.controller.signal,
        body: payload(),
      });
      await readChatStream(response, text => { content += text; changeMessage({ content }); }, run.controller.signal);
      changeMessage({ status: "complete" });
      completed = this.active === run;
    } catch (error) {
      changeMessage({ status: run.controller.signal.aborted ? "stopped" : "error", error: run.controller.signal.aborted ? undefined : error instanceof Error ? error.message : "Une erreur est survenue. Réessaie." });
    } finally {
      if (this.active === run) {
        this.active = null;
        this.publish({ activeMessageId: null });
        if (completed) { try { this.onComplete?.(conversationId); } catch { /* Alerts must not affect the reply. */ } }
      }
    }
  }
  sendMessage = async (content: string) => {
    if (this.active || !content.trim()) return;
    let conversation = this.snapshot.conversations.find(c => c.id === this.snapshot.currentConversationId);
    if (!conversation) {
      const now = new Date().toISOString();
      conversation = { id: crypto.randomUUID(), title: content.trim().slice(0, 50), messages: [], created_at: now, updated_at: now };
      this.publish({ conversations: [conversation, ...this.snapshot.conversations], currentConversationId: conversation.id });
    }
    await this.run(conversation.id, [...conversation.messages, { id: crypto.randomUUID(), role: "user", content: content.trim() }]);
  };
  retryMessage = async (id: string) => {
    if (this.active) return;
    const c = this.snapshot.conversations.find(c => c.id === this.snapshot.currentConversationId);
    if (!c) return;
    const index = c.messages.findIndex(m => m.id === id);
    const target = c.messages[index];
    if (!target || index !== c.messages.length - 1) return;
    const prefix = target.role === "assistant" ? c.messages.slice(0, index) : c.messages;
    if (prefix.at(-1)?.role === "user") await this.run(c.id, prefix);
  };
  editMessage = async (id: string, content: string) => {
    if (this.active || !content.trim()) return;
    const c = this.snapshot.conversations.find(c => c.id === this.snapshot.currentConversationId);
    const index = c?.messages.findIndex(m => m.id === id && m.role === "user") ?? -1;
    if (!c || index < 0) return;
    await this.run(c.id, [...c.messages.slice(0, index), { ...c.messages[index], content: content.trim() }]);
  };
  stopResponse = () => {
    const run = this.active;
    if (!run) return;
    this.active = null;
    run.controller.abort();
    this.publish({ activeMessageId: null, conversations: this.snapshot.conversations.map(c => c.id === run.conversationId ? {
      ...c, messages: c.messages.map(m => m.id === run.messageId ? { ...m, status: "stopped", error: undefined } : m),
    } : c) });
  };
  selectConversation = (id: string) => { this.stopResponse(); this.publish({ currentConversationId: id }); };
  startNewConversation = () => { this.stopResponse(); this.publish({ currentConversationId: null }); };
  deleteConversation = (id: string) => {
    if (this.active?.conversationId === id) this.stopResponse();
    this.publish({ conversations: this.snapshot.conversations.filter(c => c.id !== id), currentConversationId: this.snapshot.currentConversationId === id ? null : this.snapshot.currentConversationId });
  };
  renameConversation = (id: string, title: string) => { if (title.trim()) this.update(id, c => ({ ...c, title: title.trim() })); };
}
