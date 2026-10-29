import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

if (!existsSync("node_modules/vite/bin/vite.js")) {
  console.error("Installe les dependances avec npm install avant de lancer npm run dev.");
  process.exit(1);
}
const children = [
  spawn(process.execPath, ["--watch", "server/index.ts"], { stdio: "inherit" }),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js"], { stdio: "inherit" }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill();
}
for (const child of children) {
  child.on("error", error => { console.error(error.message); stop(1); });
  child.on("exit", code => stop(code ?? 0));
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
