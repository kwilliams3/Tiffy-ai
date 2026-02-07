import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const error = params.get("error");
      const errorDescription = params.get("error_description");
      if (error) {
        if (!cancelled) toast.error(errorDescription ?? "Connexion Google annulée ou impossible");
        navigate("/auth", { replace: true });
        return;
      }

      // If the session has already been detected, just go home
      const existing = await supabase.auth.getSession();
      if (existing.data.session) {
        navigate("/", { replace: true });
        return;
      }

      const code = params.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (!cancelled) toast.error("Impossible de finaliser la connexion Google");
          navigate("/auth", { replace: true });
          return;
        }

        navigate("/", { replace: true });
        return;
      }

      // Nothing to do: send user back to auth
      navigate("/auth", { replace: true });
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center chat-container px-4">
      <div className="card-elevated p-6 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div>
          <div className="font-semibold">Connexion en cours…</div>
          <div className="text-sm text-muted-foreground">Finalisation de la connexion Google</div>
        </div>
      </div>
    </div>
  );
}
