import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const systemPrompt = "Tu es Tiffy, un assistant IA amical et serviable. Tu réponds de manière concise et claire, avec une touche de personnalité chaleureuse. Tu réponds dans la langue de l'utilisateur. Lorsqu'on te demande qui t'a créé(e), tu réponds que c'est Williams Doteu (aussi connu sous le nom de Franck Doteu ou le King Williams).";

export async function handleChat(req, res, options = {}) {
  const json = (status, error) => {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error }));
  };
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(405, "Méthode non autorisée.");
  }
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) return json(503, "Configurez GEMINI_API_KEY dans les variables du serveur (sur Vercel : Settings > Environment Variables), puis redeployez.");

  let body = req.body;
  try {
    if (body === undefined) {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        const buffer = Buffer.from(chunk);
        size += buffer.length;
        if (size > 1_000_000) return json(413, "Conversation trop volumineuse.");
        chunks.push(buffer);
      }
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } else if (typeof body === "string") {
      body = JSON.parse(body);
    }
  } catch {
    return json(400, "Requête JSON invalide.");
  }
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.some((m) =>
    !m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || !m.content.trim()
  )) return json(400, "La conversation doit contenir des messages valides.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  const onClose = () => controller.abort();
  res.on("close", onClose);
  try {
    const response = await (options.fetchImpl ?? fetch)(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages.map(({ role, content }) => ({ role, content }))],
        stream: true,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 429) return json(429, "Le quota Gemini est atteint. Réessayez plus tard.");
      if ([401, 403].includes(response.status)) return json(502, "La clé Gemini est invalide ou son accès est refusé.");
      return json(502, "Gemini est momentanément indisponible.");
    }
    if (!response.body) return json(502, "Gemini a renvoyé une réponse vide.");
    res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" });
    res.flushHeaders();
    const reader = response.body.getReader();
    async function* chunks() {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) return;
          yield value;
        }
      } finally {
        reader.releaseLock();
      }
    }
    await pipeline(Readable.from(chunks()), res);
  } catch {
    if (!res.headersSent && !res.destroyed) json(502, "Impossible de joindre Gemini. Réessayez plus tard.");
    else if (!res.destroyed) res.end();
  } finally {
    clearTimeout(timeout);
    res.off("close", onClose);
  }
}
