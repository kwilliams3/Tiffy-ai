import { writeFileSync } from "node:fs";
import path from "node:path";

const raw = process.env.ANDROID_SIGNING_BUNDLE;
if (!raw) throw new Error("Configurer le secret ANDROID_SIGNING_BUNDLE avant de publier une mise à jour Android.");
let bundle;
try { bundle = JSON.parse(raw); } catch { throw new Error("Le secret de signature doit être un objet JSON valide."); }
if (!bundle || typeof bundle !== "object") throw new Error("Secret de signature invalide.");
if (!/^[a-zA-Z0-9+/=]+$/.test(bundle.keystore) || !/^[a-f0-9]{64}$/.test(bundle.password) || bundle.alias !== "tiffy") throw new Error("Secret de signature invalide.");
const file = path.join(process.env.RUNNER_TEMP || ".android-signing.local", "tiffy-signing.p12");
writeFileSync(file, Buffer.from(bundle.keystore, "base64"), { mode: 0o600 });
console.log(`::add-mask::${bundle.password}`);
writeFileSync(process.env.GITHUB_ENV, `TIFFY_KEYSTORE_PATH=${file}\nTIFFY_KEYSTORE_PASSWORD=${bundle.password}\nTIFFY_KEY_ALIAS=tiffy\n`, { flag: "a" });
