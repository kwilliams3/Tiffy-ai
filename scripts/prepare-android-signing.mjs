import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { randomBytes, X509Certificate } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const dir = path.join(root, ".android-signing.local");
const bundle = path.join(dir, "github-secret.json");
if (existsSync(bundle)) { console.log("La signature fixe existe déjà. Ne pas la régénérer : .android-signing.local/github-secret.json"); process.exit(0); }
mkdirSync(dir, { recursive: true, mode: 0o700 });
const key = path.join(dir, "private-key.pem"), cert = path.join(dir, "certificate.pem"), keystore = path.join(dir, "tiffy-signing.p12");
if ([key, cert, keystore].some(existsSync)) throw new Error("Une signature partielle existe. La vérifier avant toute nouvelle génération.");
const openssl = process.platform === "win32" && existsSync("C:/Program Files/Git/usr/bin/openssl.exe") ? "C:/Program Files/Git/usr/bin/openssl.exe" : "openssl";
const password = randomBytes(32).toString("hex");
function run(args) {
  const result = spawnSync(openssl, args, { windowsHide: true, encoding: "utf8", env: { ...process.env, TIFFY_SIGNING_PASSWORD: password } });
  if (result.status !== 0) throw new Error("Création de la signature impossible. Vérifier OpenSSL et les fichiers locaux avant de réessayer.");
}
run(["req", "-x509", "-newkey", "rsa:3072", "-sha256", "-nodes", "-keyout", key, "-out", cert, "-days", "10950", "-subj", "/CN=Tiffy/O=Tiffy"]);
run(["pkcs12", "-export", "-out", keystore, "-inkey", key, "-in", cert, "-name", "tiffy", "-passout", "env:TIFFY_SIGNING_PASSWORD"]);
writeFileSync(bundle, JSON.stringify({ keystore: readFileSync(keystore).toString("base64"), password, alias: "tiffy" }), { mode: 0o600 });
unlinkSync(key);
console.log("Signature fixe créée. Sauvegarder le dossier .android-signing.local dans un emplacement privé.");
console.log("Empreinte publique SHA-256 : " + new X509Certificate(readFileSync(cert)).fingerprint256);
console.log("Secret GitHub à créer : ANDROID_SIGNING_BUNDLE, avec le contenu de .android-signing.local/github-secret.json. Ne jamais committer ce fichier.");
