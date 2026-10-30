import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { checkAppUpdates, downloadAppUpdate, getUpdateSnapshot, subscribeUpdates, supportsAppUpdates } from "@/lib/app-updates";

function download() { void downloadAppUpdate().catch(() => toast.error("Impossible d’ouvrir le téléchargement. Réessaie.")); }
export function AppUpdateNotice() {
  const state = useSyncExternalStore(subscribeUpdates, getUpdateSnapshot);
  const [dismissed, setDismissed] = useState<number | null>(null);
  useEffect(() => { if (supportsAppUpdates()) void checkAppUpdates(); }, []);
  if (!supportsAppUpdates() || state.status !== "available" || !state.release || dismissed === state.release.code) return null;
  return <aside className="app-update-notice" aria-label="Mise à jour de Tiffy" role="status"><Download className="h-5 w-5 shrink-0" /><div><strong>Une nouvelle version de Tiffy est prête</strong><p>Télécharge l’APK, puis confirme l’installation dans Android.</p><button type="button" onClick={download}>Télécharger la mise à jour</button></div><button type="button" className="app-update-dismiss" aria-label="Me le rappeler plus tard" onClick={() => setDismissed(state.release!.code)}><X className="h-4 w-4" /></button></aside>;
}
export function AppUpdatesSettings() {
  const state = useSyncExternalStore(subscribeUpdates, getUpdateSnapshot);
  if (!supportsAppUpdates()) return null;
  return <section className="settings-section"><div><h2><Download />Mises à jour Android</h2><p>Installe les nouvelles versions de Tiffy.</p></div><div className="card-elevated p-5"><p className="text-sm font-semibold">{state.version ? `Version installée : ${state.version.name}` : "Application Android"}</p><p className="my-3 text-xs text-muted-foreground" role="status">{state.status === "error" ? state.error : state.status === "checking" ? "Vérification en cours…" : state.status === "available" ? "Une nouvelle version est disponible." : state.status === "current" ? "Tu utilises la dernière version publiée." : "Vérifie les nouvelles versions disponibles."}</p><button type="button" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50" disabled={state.status === "checking"} onClick={() => { void checkAppUpdates(); }}><RefreshCw className="h-4 w-4" />Vérifier les mises à jour</button>{state.release && <button type="button" className="ml-3 mt-3 text-sm underline" onClick={download}>Télécharger l’APK</button>}</div></section>;
}
