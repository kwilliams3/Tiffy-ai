export async function getChatError(response: Response): Promise<string> {
  const fallback = `Le serveur de Tiffy rencontre un problème (HTTP ${response.status}). Réessaie dans un instant.`;
  try {
    const data: unknown = await response.json();
    if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
      return data.error;
    }
  } catch {
    // Hosting errors can be plain text or HTML instead of JSON.
  }
  return fallback;
}
