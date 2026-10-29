import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { handleChat } from "./chat.mjs";

if (existsSync(".env")) process.loadEnvFile(".env");
const port = Number(process.env.BACKEND_PORT || 4317);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid BACKEND_PORT");

const server = createServer((req, res) => {
  if (req.url?.split("?")[0] === "/api/chat") return void handleChat(req, res);
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Route introuvable" }));
});
server.on("error", (error) => {
  console.error(`Backend port ${port}: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () => console.log(`Backend: http://127.0.0.1:${port}`));
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => { server.closeAllConnections(); server.close(); });
}
