import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
export default function NotFound() {
  return <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center"><div className="welcome-emblem"><Compass /></div><span className="eyebrow">ERREUR 404 · PETIT DÉTOUR</span><h1 className="mb-4 mt-5 font-serif text-4xl tracking-tight sm:text-5xl">On s’est un peu égarés.</h1><p className="max-w-xs text-sm leading-7 text-muted-foreground">Cette page n’existe pas, mais il reste plein de choses à explorer ensemble.</p><Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm text-primary-foreground transition-opacity hover:opacity-90"><ArrowLeft className="h-4 w-4" />Retrouver Tiffy</Link></main>;
}
