import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Palette, Bell, Shield, Moon, Sun, Monitor, Sparkles, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import tiffyLogo from "@/assets/tiffy-logo.png";

const STORAGE_KEY = "tiffy_conversations";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        toast.success("Application installée !");
      }
      setDeferredPrompt(null);
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Historique supprimé");
  };

  const themes = [
    { value: "light", label: "Clair", icon: Sun },
    { value: "dark", label: "Sombre", icon: Moon },
    { value: "system", label: "Système", icon: Monitor },
  ];

  return (
    <div className="min-h-screen chat-container">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/3 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="flex items-center gap-4 glass-effect px-4 py-3 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="rounded-xl"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold text-lg text-foreground">Paramètres</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 relative">
        {/* Install PWA Section */}
        {(deferredPrompt || 'standalone' in navigator) && (
          <section className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 px-1">
              <Download className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold">Installation</h2>
            </div>
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Installer Tiffy</p>
                  <p className="text-sm text-muted-foreground">Ajoute l'app sur ton écran d'accueil</p>
                </div>
                <Button
                  onClick={handleInstall}
                  disabled={!deferredPrompt}
                  className="btn-primary-gradient"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Installer
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Theme Section */}
        <section className="space-y-3 animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <div className="flex items-center gap-2 px-1">
            <Palette className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Apparence</h2>
          </div>
          <div className="card-elevated p-6">
            <div className="grid grid-cols-3 gap-3">
              {themes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                    theme === value
                      ? "border-primary bg-primary/10 shadow-lg"
                      : "border-border/50 hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <div className={`p-2.5 rounded-lg ${theme === value ? "bg-primary/20" : "bg-muted"}`}>
                    <Icon className={`h-5 w-5 ${theme === value ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <span className={`text-sm font-medium ${theme === value ? "text-primary" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="space-y-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-2 px-1">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Notifications</h2>
          </div>
          <div className="card-elevated p-6 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Activer les notifications</p>
                <p className="text-sm text-muted-foreground">Recevoir des alertes pour les nouvelles réponses</p>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Sons</p>
                <p className="text-sm text-muted-foreground">Jouer un son lors des réponses</p>
              </div>
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </div>
          </div>
        </section>

        {/* Clear History Section */}
        <section className="space-y-3 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="flex items-center gap-2 px-1">
            <Trash2 className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Données</h2>
          </div>
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Effacer l'historique</p>
                <p className="text-sm text-muted-foreground">Supprimer toutes les conversations locales</p>
              </div>
              <Button
                variant="destructive"
                onClick={handleClearHistory}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Effacer
              </Button>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="space-y-3 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-2 px-1">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">À propos</h2>
          </div>
          <div className="card-elevated p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                <img src={tiffyLogo} alt="Tiffy" className="h-10 w-10" />
              </div>
              <div>
                <p className="font-semibold gradient-text text-lg">Tiffy</p>
                <p className="text-sm text-muted-foreground">Version 1.0.0</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tiffy est ton assistant IA personnel, toujours prêt à t'aider avec tes questions !
              Développé avec ❤️ pour une expérience conversationnelle fluide et intuitive.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
