import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Palette, Bell, Shield, LogOut, Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import tiffyLogo from "@/assets/tiffy-logo.png";

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const themes = [
    { value: "light", label: "Clair", icon: Sun },
    { value: "dark", label: "Sombre", icon: Moon },
    { value: "system", label: "Système", icon: Monitor },
  ];

  return (
    <div className="min-h-screen chat-container">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-border/50 bg-card/80 backdrop-blur-sm px-4 py-3 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold text-foreground">Paramètres</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Profile Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Profil</h2>
          </div>
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <img src={tiffyLogo} alt="Avatar" className="h-12 w-12 rounded-full object-cover" />
              </div>
              <div>
                <p className="font-medium">{user?.email}</p>
                <p className="text-sm text-muted-foreground">Membre depuis peu</p>
              </div>
            </div>
          </div>
        </section>

        {/* Theme Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Apparence</h2>
          </div>
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="grid grid-cols-3 gap-3">
              {themes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    theme === value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Icon className={`h-6 w-6 ${theme === value ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${theme === value ? "text-primary" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Notifications</h2>
          </div>
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Activer les notifications</p>
                <p className="text-sm text-muted-foreground">Recevoir des alertes pour les nouvelles réponses</p>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sons</p>
                <p className="text-sm text-muted-foreground">Jouer un son lors des réponses</p>
              </div>
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">À propos</h2>
          </div>
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-4">
              <img src={tiffyLogo} alt="Tiffy" className="h-12 w-12" />
              <div>
                <p className="font-semibold gradient-text">Tiffy</p>
                <p className="text-sm text-muted-foreground">Version 1.0.0</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Tiffy est ton assistant IA personnel, toujours prêt à t'aider avec tes questions ! 
              Développé avec ❤️ pour une expérience conversationnelle fluide et intuitive.
            </p>
          </div>
        </section>

        {/* Logout Section */}
        <section>
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Se déconnecter
          </Button>
        </section>
      </div>
    </div>
  );
}
