import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Palette, Bell, Shield, Moon, Sun, Monitor, Sparkles, Download, Trash2, Check, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTheme } from "next-themes";
import { toast } from "sonner";

interface InstallPrompt extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
const themes = [ { value: "light", label: "Clair", icon: Sun }, { value: "dark", label: "Sombre", icon: Moon }, { value: "system", label: "Automatique", icon: Monitor } ];

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  useEffect(() => {
    const handler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  const install = async () => {
    if (!installPrompt) return;
    try { await installPrompt.prompt(); if ((await installPrompt.userChoice).outcome === "accepted") toast.success("Tiffy a trouvé sa place sur ton écran !"); }
    catch { toast.error("L’installation n’a pas abouti. Réessaie depuis ton navigateur."); }
    finally { setInstallPrompt(null); }
  };
  const clearHistory = () => {
    try { localStorage.removeItem("tiffy_conversations"); toast.success("Ton historique a été effacé."); }
    catch { toast.error("Impossible d’effacer l’historique sur ce navigateur."); }
  };

  return <main className="settings-page">
    <header className="workspace-header"><Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-4 w-4" />Retour à la conversation</Link><Link to="/" className="flex items-center gap-2 text-primary"><Sparkles className="h-5 w-5" /><span className="text-xl font-semibold tracking-tight">tiffy.</span></Link></header>
    <div className="settings-layout animate-slide-up">
      <div className="settings-intro"><span className="eyebrow">FAIS COMME CHEZ TOI</span><h1>Ton espace, à ta façon.</h1><p>Les petits détails qui rendent Tiffy un peu plus toi.</p></div>
      <section className="settings-section"><div><h2><Palette />Apparence</h2><p>Une ambiance adaptée à tes envies, de jour comme de nuit.</p></div><div className="grid grid-cols-3 gap-3">{themes.map(({ value, label, icon: Icon }) => <button key={value} aria-pressed={theme === value} className={`theme-choice ${theme === value ? "selected" : ""}`} onClick={() => setTheme(value)}><span aria-hidden="true" className={`theme-miniature ${value === "dark" ? "dark-preview" : value === "system" ? "system-preview" : ""}`}><i /><span><b /><b /><b /></span></span><span className="flex items-center justify-between gap-1 text-[11px] font-medium"><span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" />{label}</span>{theme === value && <Check className="h-3 w-3 text-primary" />}</span></button>)}</div></section>
      {installPrompt && <section className="settings-section"><div><h2><Download />Toujours à portée de main</h2><p>Retrouve Tiffy directement sur ton écran d’accueil.</p></div><div className="card-elevated flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="text-sm font-semibold">Un raccourci vers tes idées</p><p className="mt-1 text-xs text-muted-foreground">Installe l’application sur cet appareil.</p></div><Button onClick={install} className="gap-2"><Download className="h-4 w-4" />Installer</Button></div></section>}
      <section className="settings-section"><div><h2><Bell />À ton rythme</h2><p>De nouvelles façons de rester en contact arrivent bientôt.</p></div><div className="card-elevated divide-y divide-border px-5"><div className="flex items-center justify-between gap-4 py-5"><div><p className="text-sm font-medium">Notifications <span className="coming-soon">À venir</span></p><p className="mt-1.5 text-xs text-muted-foreground">Être prévenu quand une réponse est prête.</p></div><Switch aria-label="Notifications, bientôt disponibles" checked={false} disabled /></div><div className="flex items-center justify-between gap-4 py-5"><div><p className="text-sm font-medium">Sons <span className="coming-soon">À venir</span></p><p className="mt-1.5 text-xs text-muted-foreground">Une petite note à chaque réponse.</p></div><Switch aria-label="Sons, bientôt disponibles" checked={false} disabled /></div></div></section>
      <section className="settings-section"><div><h2><Shield />Tes conversations</h2><p>Ton historique reste enregistré dans ce navigateur. Les messages sont transmis à Google pour générer les réponses.</p></div><div className="card-elevated p-5"><div className="mb-5 flex items-start gap-3"><span className="rounded-xl bg-muted p-2.5"><MessageIcon /></span><div><p className="text-sm font-semibold">Faire place aux nouvelles idées</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Supprime toutes les conversations enregistrées sur cet appareil. Cette action est définitive.</p></div></div><AlertDialog><AlertDialogTrigger asChild><Button variant="outline" className="gap-2 border-destructive/25 text-destructive hover:bg-destructive/5 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" />Effacer mon historique</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Effacer toutes tes conversations ?</AlertDialogTitle><AlertDialogDescription>Les conversations enregistrées dans ce navigateur seront supprimées. Tu ne pourras pas les récupérer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Garder mes conversations</AlertDialogCancel><AlertDialogAction onClick={clearHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Tout effacer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></section>
      <section className="settings-section"><div><h2><Sparkles />Un mot sur Tiffy</h2><p>Un compagnon pour les idées du quotidien.</p></div><div className="about-card"><span className="about-symbol"><Sparkles className="h-7 w-7" /></span><div><h3>Un peu de curiosité.<br />Beaucoup de possibilités.</h3><p>Tiffy t’aide à écrire, comprendre et imaginer. Une conversation à la fois.</p><span className="mt-4 block text-[10px] tracking-widest opacity-60">TIFFY · VERSION 1.0</span></div><ArrowUpRight className="absolute right-5 top-5 h-4 w-4 opacity-40" aria-hidden="true" /></div></section>
      <p className="pt-4 text-center text-[10px] text-muted-foreground">Pensé pour tes questions, tes projets et tes prochaines grandes idées.</p>
    </div>
  </main>;
}

function MessageIcon() { return <Trash2 className="h-4 w-4 text-muted-foreground" />; }
