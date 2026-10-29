import { getChatError } from "./chat-errors.ts";

export async function readChatStream(response: Response, onText: (text: string) => void, signal: AbortSignal) {
  if (!response.ok) throw new Error(await getChatError(response));
  if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
    throw new Error("Le serveur n’a pas renvoyé de réponse valide. Réessaie.");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", event: string[] = [], finished = false, receivedText = false;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", abort, { once: true });
  const dispatch = () => {
    if (!event.length) return;
    const raw = event.join("\n");
    event = [];
    if (raw.trim() === "[DONE]") { finished = true; return; }
    let data;
    try { data = JSON.parse(raw); }
    catch { throw new Error("La réponse reçue est incomplète. Réessaie sans renvoyer ton message."); }
    if (data.error) throw new Error("La réponse a été interrompue par le service IA. Réessaie.");
    const choice = data.choices?.[0];
    if (typeof choice?.delta?.content === "string" && choice.delta.content) {
      receivedText = true;
      onText(choice.delta.content);
    }
    if (choice?.finish_reason) finished = true;
  };
  const line = (value: string) => {
    if (!value.trim()) dispatch();
    else if (value.startsWith("data:")) event.push(value.slice(5).replace(/^ /, ""));
  };
  try {
    signal.throwIfAborted();
    while (!finished) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let index: number;
      while ((index = buffer.indexOf("\n")) >= 0) {
        line(buffer.slice(0, index).replace(/\r$/, ""));
        buffer = buffer.slice(index + 1);
        if (finished) break;
      }
      if (done) {
        if (buffer) line(buffer.replace(/\r$/, ""));
        dispatch();
        break;
      }
    }
    if (!finished) throw new Error("La connexion a été interrompue. Tu peux réessayer sans perdre ton message.");
    if (!receivedText) throw new Error("Gemini n’a renvoyé aucun texte. Essaie de reformuler ou réessaie.");
  } finally {
    signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
