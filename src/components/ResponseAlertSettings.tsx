import { useEffect, useState } from "react";
import { Bell, Volume2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { loadReplyPreferences, saveReplyPreference, loadAutoSpeak, saveAutoSpeak } from "@/lib/chat-preferences";
import { speechPlayback, supportsSpeech } from "@/lib/speech-playback";
import { notificationPermission, requestReplyNotifications, supportsReplySound, prepareReplySound, playReplySound } from "@/lib/response-alerts";

function readPreferences() {
  try { return loadReplyPreferences(window.localStorage); }
  catch { return { notifications: false, sounds: false }; }
}

export function ResponseAlertSettings() {
  const [preferences, setPreferences] = useState(readPreferences);
  const [permission, setPermission] = useState(notificationPermission);
  const [asking, setAsking] = useState(false);
  const [preparingSound, setPreparingSound] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(() => { try { return loadAutoSpeak(window.localStorage); } catch { return false; } });
  const soundSupported = supportsReplySound();
  useEffect(() => {
    const sync = () => {
      const next = notificationPermission();
      const preferences = readPreferences();
      setPermission(next);
      if (next !== "granted" && preferences.notifications) {
        preferences.notifications = false;
        try { saveReplyPreference(window.localStorage, "notifications", false); } catch { /* Permission is checked again before every alert. */ }
      }
      setPreferences(preferences);
      try { setAutoSpeak(loadAutoSpeak(window.localStorage)); } catch { /* Keep the displayed preference. */ }
    };
    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("focus", sync); window.removeEventListener("storage", sync); };
  }, []);

  const save = (name: "notifications" | "sounds", enabled: boolean) => {
    try {
      saveReplyPreference(window.localStorage, name, enabled);
      setPreferences(previous => ({ ...previous, [name]: enabled }));
      return true;
    } catch { toast.error("Impossible d’enregistrer ce réglage dans ce navigateur."); return false; }
  };
  const toggleNotifications = async (enabled: boolean) => {
    if (!enabled) { save("notifications", false); return; }
    // Invoke the permission request directly from the switch's user gesture.
    const request = requestReplyNotifications();
    setAsking(true);
    try {
      const result = await request;
      setPermission(result);
      if (result === "granted") {
        if (save("notifications", true)) toast.success("Tu seras prévenu quand la réponse sera prête.");
      } else if (result === "denied") toast.info("Autorise les notifications dans les réglages du site de ton navigateur.");
      else if (result === "default") toast.info("Aucune autorisation donnée. Les notifications restent désactivées.");
    } catch { toast.error("Le navigateur n’a pas pu activer les notifications."); }
    finally { setAsking(false); }
  };
  const toggleSound = async (enabled: boolean) => {
    if (!enabled) { save("sounds", false); return; }
    const preparation = prepareReplySound();
    setPreparingSound(true);
    try {
      if (!await preparation) { toast.info("Le son est bloqué par le navigateur. Réessaie après avoir autorisé la lecture audio."); return; }
      if (save("sounds", true)) playReplySound();
    } catch { toast.error("Impossible de lire le son sur cet appareil."); }
    finally { setPreparingSound(false); }
  };
  const previewSound = async () => {
    try {
      if (await prepareReplySound()) playReplySound();
      else toast.info("La lecture audio n’est pas disponible pour le moment.");
    } catch { toast.error("Impossible de lire le son sur cet appareil."); }
  };
  const toggleSpokenReplies = (enabled: boolean) => {
    try {
      saveAutoSpeak(window.localStorage, enabled);
      setAutoSpeak(enabled);
      if (enabled) speechPlayback.prepare(); else speechPlayback.stop();
    } catch { toast.error("Impossible d’enregistrer ce réglage."); }
  };

  return <section className="settings-section">
    <div><h2><Bell />À ton rythme</h2><p>Choisis comment Tiffy te prévient qu’une réponse est prête.</p></div>
    <div className="card-elevated divide-y divide-border px-5">
      <div className="py-5"><div className="flex items-start justify-between gap-4"><div><label htmlFor="reply-notifications" className="cursor-pointer text-sm font-medium">Notifications</label><p id="notifications-description" className="mt-1.5 text-xs leading-relaxed text-muted-foreground">Être prévenu quand une réponse est prête et que l’onglet est en arrière-plan. Tiffy doit rester ouvert.</p></div><Switch id="reply-notifications" aria-describedby="notifications-description" checked={preferences.notifications && permission === "granted"} disabled={asking || permission === "unsupported"} onCheckedChange={toggleNotifications} className="shrink-0" /></div>
        {asking && <p className="mt-3 text-[11px] text-muted-foreground" role="status">Confirme l’autorisation dans ton navigateur.</p>}
        {permission === "denied" && <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Notifications bloquées : ouvre les réglages du site dans ton navigateur pour les autoriser.</p>}
        {permission === "unsupported" && <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Notifications non disponibles ici. Selon ton appareil, installe Tiffy sur l’écran d’accueil ou utilise un navigateur compatible en HTTPS.</p>}
      </div>
      <div className="py-5"><div className="flex items-start justify-between gap-4"><div><label htmlFor="reply-sounds" className="cursor-pointer text-sm font-medium">Sons</label><p id="sounds-description" className="mt-1.5 text-xs leading-relaxed text-muted-foreground">Une petite note à la fin de chaque réponse réussie.</p></div><Switch id="reply-sounds" aria-describedby="sounds-description" checked={preferences.sounds} disabled={(!soundSupported && !preferences.sounds) || preparingSound} onCheckedChange={toggleSound} className="shrink-0" /></div>
        {soundSupported ? <Button type="button" variant="ghost" size="sm" className="mt-3 h-8 gap-2 px-2 text-xs text-primary" onClick={previewSound}><Volume2 className="h-3.5 w-3.5" />Écouter le son</Button> : <p className="mt-3 text-[11px] text-muted-foreground">La lecture audio n’est pas disponible dans ce navigateur.</p>}
      </div>
      <div className="py-5"><div className="flex items-start justify-between gap-4"><div><label htmlFor="spoken-replies" className="cursor-pointer text-sm font-medium">Réponses vocales</label><p id="spoken-description" className="mt-1.5 text-xs leading-relaxed text-muted-foreground">Lire automatiquement les réponses terminées quand l’onglet est visible. Tu peux aussi utiliser « Écouter » sous une réponse.</p></div><Switch id="spoken-replies" aria-describedby="spoken-description" checked={autoSpeak} disabled={!supportsSpeech() && !autoSpeak} onCheckedChange={toggleSpokenReplies} className="shrink-0" /></div><p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Le bouton micro du chat transcrit ta voix en texte avant l’envoi. Selon le navigateur, le son peut être traité par son service de reconnaissance vocale. Les voix de lecture dépendent de ton appareil.</p>{!supportsSpeech() && <p className="mt-2 text-[11px] text-muted-foreground">Lecture vocale indisponible dans ce navigateur.</p>}</div>
    </div>
  </section>;
}
