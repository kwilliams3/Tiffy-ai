export function chatApiUrl(base = import.meta.env?.VITE_API_BASE_URL || "") {
  if (!base) return "/api/chat";
  const url = new URL(base);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("VITE_API_BASE_URL doit être une origine HTTPS, sans chemin ni identifiants.");
  }
  return `${url.origin}/api/chat`;
}
