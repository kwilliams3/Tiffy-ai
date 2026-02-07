import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import tiffyLogo from "@/assets/tiffy-logo.png";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Email ou mot de passe incorrect");
          } else if (error.message.includes("Email not confirmed")) {
            toast.error("Vérifie ton email pour confirmer ton compte");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Connexion réussie !");
          navigate("/");
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Cet email est déjà utilisé");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Compte créé ! Vérifie ton email pour confirmer.");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        // Use a dedicated callback route to avoid landing on a 404 after OAuth redirect
        redirect_uri: `${window.location.origin}/auth/callback`,
      });

      if (result.error) {
        toast.error("Erreur lors de la connexion avec Google");
        console.error(result.error);
      }
    } catch (error) {
      toast.error("Erreur lors de la connexion avec Google");
      console.error(error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center chat-container px-4 py-8">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in relative">
          <div className="relative inline-block">
            <img src={tiffyLogo} alt="Tiffy" className="h-24 w-24 mx-auto mb-4 ai-glow rounded-3xl" />
            <div className="absolute -top-1 -right-1 bg-gradient-to-br from-primary to-accent p-1.5 rounded-full">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold gradient-text tracking-tight">Tiffy</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            {isLogin ? "Content de te revoir !" : "Crée ton compte"}
          </p>
        </div>

        <div className="card-elevated p-8 animate-slide-up">
          {/* Google Sign In Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full mb-6 h-12 text-base font-medium hover:bg-muted/80 transition-all duration-200"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Continuer avec Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-4 text-muted-foreground font-medium">ou continue avec email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 input-modern"
                  required
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-12 input-modern"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold btn-primary-gradient"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isLogin ? (
                "Se connecter"
              ) : (
                "Créer mon compte"
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 font-medium"
            >
              {isLogin
                ? "Pas encore de compte ? Inscris-toi"
                : "Déjà un compte ? Connecte-toi"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          En continuant, tu acceptes nos conditions d'utilisation
        </p>
      </div>
    </div>
  );
}
