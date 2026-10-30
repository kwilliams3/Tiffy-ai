export interface AndroidVersion { code: number; name: string }
export interface AndroidRelease { code: number; name: string; url: string }
interface UpdateBridge { version: () => Promise<AndroidVersion>; open: (url: string) => Promise<void> }
let bridge: UpdateBridge | undefined;
export function configureAppUpdates(value: UpdateBridge) { bridge = value; }
export const supportsAppUpdates = () => !!bridge;
const api = "https://api.github.com/repos/kwilliams3/Tiffy-ai/releases/latest";
export function parseAndroidRelease(value: unknown, current: number): AndroidRelease | null {
  const release = value as { draft?: boolean; prerelease?: boolean; tag_name?: string; assets?: { name: string; browser_download_url: string }[] };
  if (!release || release.draft || release.prerelease || typeof release.tag_name !== "string") return null;
  const match = /^android-(\d+)$/.exec(release.tag_name);
  const code = match ? Number(match[1]) : 0;
  if (!Number.isSafeInteger(code) || code <= current) return null;
  const asset = Array.isArray(release.assets) ? release.assets.find(a => a?.name === "Tiffy.apk") : undefined;
  const expected = `https://github.com/kwilliams3/Tiffy-ai/releases/download/android-${code}/Tiffy.apk`;
  if (asset?.browser_download_url !== expected) return null;
  return { code, name: `1.0.${code}`, url: expected };
}
interface UpdateState { status: "idle" | "checking" | "available" | "current" | "error"; version?: AndroidVersion; release?: AndroidRelease; error?: string }
let snapshot: UpdateState = { status: "idle" };
const listeners = new Set<() => void>();
let pending: Promise<void> | undefined;
function publish(value: UpdateState) { snapshot = value; listeners.forEach(fn => fn()); }
export const getUpdateSnapshot = () => snapshot;
export const subscribeUpdates = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export function checkAppUpdates() {
  if (!bridge) return Promise.resolve();
  if (pending) return pending;
  const platform = bridge;
  let installed = snapshot.version;
  publish({ status: "checking", version: snapshot.version });
  pending = (async () => {
    try {
      const version = await platform.version();
      installed = version;
      const response = await fetch(api, { headers: { Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(12_000), cache: "no-store" });
      if (response.status === 404) { publish({ status: "current", version }); return; }
      if (!response.ok) throw new Error("La vérification est indisponible. Réessaie plus tard.");
      const release = parseAndroidRelease(await response.json(), version.code);
      publish({ status: release ? "available" : "current", version, release: release || undefined });
    } catch (error) { publish({ status: "error", version: installed, error: error instanceof Error && error.name !== "TimeoutError" ? error.message : "Connexion trop lente. Réessaie plus tard." }); }
    finally { pending = undefined; }
  })();
  return pending;
}
export async function downloadAppUpdate() {
  const release = snapshot.release;
  if (!bridge || !release || !/^https:\/\/github\.com\/kwilliams3\/Tiffy-ai\/releases\/download\/android-\d+\/Tiffy\.apk$/.test(release.url)) return;
  await bridge.open(release.url);
}
