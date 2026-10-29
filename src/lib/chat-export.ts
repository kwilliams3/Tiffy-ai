import type { Conversation } from "./chat-store.ts";

export function serializeConversations(conversations: Conversation[], format: "json" | "md", date = new Date().toISOString()) {
  if (format === "json") return JSON.stringify({ version: 1, exported_at: date, conversations }, null, 2);
  return conversations.map(c => `# ${c.title}\n\n` + c.messages.map(m => {
    const note = m.status === "stopped" ? "\n\n_Réponse arrêtée._" : m.status === "error" ? "\n\n_Réponse interrompue._" : "";
    return `## ${m.role === "user" ? "Toi" : "Tiffy"}\n\n${m.content}${note}`;
  }).join("\n\n---\n\n")).join("\n\n---\n\n") + "\n";
}

export function downloadConversations(conversations: Conversation[], format: "json" | "md") {
  if (!conversations.length) return;
  const data = serializeConversations(conversations, format);
  const url = URL.createObjectURL(new Blob([data], { type: format === "json" ? "application/json;charset=utf-8" : "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `tiffy-${conversations.length === 1 ? "conversation" : "historique"}-${new Date().toISOString().slice(0, 10)}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
