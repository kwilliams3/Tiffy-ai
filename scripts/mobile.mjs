import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const mobile = path.join(root, "mobile");
const platform = process.argv[2];
if (!["android", "ios"].includes(platform)) throw new Error("Choisir android ou ios.");
if (platform === "ios" && process.platform !== "darwin") throw new Error("La préparation iOS nécessite macOS et Xcode.");
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
// Run npm through Node to avoid Windows shell interpolation.
const npm = process.env.npm_execpath;
if (!npm) throw new Error("Lancer cette commande avec npm run mobile:android ou mobile:ios.");
const cli = path.join(mobile, "node_modules/@capacitor/cli/bin/capacitor");
if (process.argv.includes("--open")) {
  if (!existsSync(cli)) throw new Error("Préparer le projet mobile avant de l’ouvrir.");
  run(process.execPath, [cli, "open", platform], mobile); process.exit(0);
}
run(process.execPath, [npm, existsSync(path.join(mobile, "package-lock.json")) ? "ci" : "install", "--prefix", mobile, "--fetch-retries=1", "--fetch-timeout=30000"]);
run(process.execPath, [npm, "run", "build:mobile"]);
if (!existsSync(path.join(mobile, platform))) run(process.execPath, [cli, "add", platform], mobile);
if (platform === "ios") {
  const plist = path.join(mobile, "ios/App/App/Info.plist");
  let content = readFileSync(plist, "utf8");
  for (const [key, reason] of Object.entries({ NSMicrophoneUsageDescription: "Tiffy utilise le microphone pour transcrire tes messages vocaux.", NSSpeechRecognitionUsageDescription: "Tiffy transcrit tes paroles pour discuter avec toi." })) {
    if (!content.includes(`<key>${key}</key>`)) content = content.replace(/<\/dict>\s*<\/plist>/, `<key>${key}</key><string>${reason}</string></dict></plist>`);
  }
  writeFileSync(plist, content);
}
run(process.execPath, [cli, "sync", platform], mobile);
console.log(`Projet ${platform} prêt dans mobile/${platform}. Ouvrir avec npm run mobile:open:${platform}.`);
