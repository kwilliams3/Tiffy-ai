import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, X, Captions, SlidersHorizontal } from "lucide-react";
import type { DiscussionState } from "@/lib/voice-conversation";

interface Props {
  state: DiscussionState;
  onClose: () => void;
  onPause: () => void;
  onResume: () => void;
  reply?: string;
}
const labels: Record<DiscussionState, string> = {
  off: "", paused: "Micro en pause", listening: "Je t’écoute", thinking: "Un instant…", speaking: "Tiffy te répond",
};

export function VoiceDiscussion({ state, onClose, onPause, onResume, reply }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [captions, setCaptions] = useState(false);
  const [help, setHelp] = useState(false);
  const active = state !== "off";
  useEffect(() => {
    const element = dialog.current;
    if (active && element && !element.open) element.showModal();
    if (!active && element?.open) element.close();
    return () => { if (element?.open) element.close(); };
  }, [active]);
  return <dialog ref={dialog} className="voice-screen" aria-labelledby="voice-screen-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="voice-screen-layout">
      <header className="voice-screen-header">
        <button className="voice-round" type="button" aria-label="Afficher les sous-titres" aria-pressed={captions} onClick={() => setCaptions(!captions)}><Captions /></button>
        <span id="voice-screen-title">TIFFY <span>VOCAL</span></span>
        <button className="voice-round" type="button" aria-label="Informations sur la discussion vocale" aria-expanded={help} onClick={() => setHelp(!help)}><SlidersHorizontal /></button>
      </header>
      {help && <div className="voice-screen-help">Parle naturellement, puis marque une pause pour envoyer. Tiffy répond et te redonne la parole. Le bouton micro met l’échange en pause. La voix dépend de ton navigateur.</div>}
      <div className={`voice-stage voice-stage-${state}`}>
        <div className="voice-orb" aria-hidden="true"><div className="voice-orb-cloud" /><div className="voice-orb-light" /></div>
        <p className="voice-stage-status" role="status">{labels[state]}</p>
        {state === "listening" && <p className="voice-stage-hint">À toi de parler, je suis là.</p>}
        {captions && reply && <div className="voice-captions" aria-label="Dernière réponse de Tiffy">{reply}</div>}
      </div>
      <footer className="voice-screen-footer">
        <p>{state === "paused" ? "Reprends quand tu veux." : "Une conversation, tout simplement."}</p>
        <div className="voice-screen-actions">
          <button className={`voice-round voice-micro ${state === "paused" ? "muted" : ""}`} type="button" aria-label={state === "paused" ? "Réactiver le microphone" : "Mettre la discussion en pause"} aria-pressed={state === "paused"} onClick={state === "paused" ? onResume : onPause}>{state === "paused" ? <MicOff /> : <Mic />}</button>
          <button className="voice-round voice-exit" type="button" aria-label="Quitter la discussion vocale" onClick={onClose}><X /></button>
        </div>
      </footer>
    </div>
  </dialog>;
}
