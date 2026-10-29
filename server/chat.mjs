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
  const apiKey = (options.apiKey ?? process.env.GEMINI_API_KEY)?.trim();
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
  // Leave time to send a JSON error before Vercel's 60-second limit.
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 45_000);
  const onClose = () => controller.abort();
  res.on("close", onClose);
  try {
    const response = await (options.fetchImpl ?? fetch)(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gemini-3.1-flash-lite",
        messages: [{ role: "system", content: systemPrompt }, ...messages.map(({ role, content }) => ({ role, content }))],
        stream: true,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      // Google can return either an error object or an array of error objects.
      const payload = await response.json().catch(() => null);
      const upstreamError = Array.isArray(payload) ? payload[0]?.error : payload?.error;
      const reasons = upstreamError?.details?.map(detail => detail?.reason) || [];
      console.error("Gemini request rejected", { status: response.status, code: upstreamError?.status });
      if (response.status === 429) return json(429, "Le quota Gemini est atteint. Réessayez plus tard.");
      if ([401, 403].includes(response.status) || reasons.includes("API_KEY_INVALID")) return json(502, "La clé Gemini est invalide ou son accès est refusé. Vérifiez GEMINI_API_KEY sur le serveur.");
      if (response.status === 404) return json(502, "Le modèle Gemini configuré n’est pas disponible pour ce compte. Mettez à jour le modèle sur le serveur.");
      if (response.status === 400) return json(502, "Google a refusé la requête. Vérifiez la configuration du projet Gemini et les restrictions de sa clé.");
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
    if (!res.headersSent && !res.destroyed) {
      if (controller.signal.aborted) json(504, "Google met trop de temps à répondre. Réessayez dans un instant.");
      else json(502, "Impossible de joindre Gemini. Réessayez plus tard.");
    }
    else if (!res.destroyed) res.end();
  } finally {
    clearTimeout(timeout);
    res.off("close", onClose);
  }
}
