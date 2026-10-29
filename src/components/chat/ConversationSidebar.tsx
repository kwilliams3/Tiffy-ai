import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, Plus, Trash2, X, Pencil, Check, Search, Settings, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Conversation { id: string; title: string; created_at: string; updated_at: string }
interface Props {
  conversations: Conversation[]; currentConversationId: string | null; isLoading: boolean; isOpen: boolean;
  onClose: () => void; onSelect: (id: string) => void; onNew: () => void;
  onDelete: (id: string) => void; onRename: (id: string, title: string) => void;
}

export function ConversationSidebar({ conversations, currentConversationId, isLoading, isOpen, onClose, onSelect, onNew, onDelete, onRename }: Props) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && window.matchMedia("(max-width: 767px)").matches) {
        const elements = Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled)") || []).filter(el => el.getClientRects().length > 0);
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", close);
    return () => { window.removeEventListener("keydown", close); previous?.focus(); };
  }, [isOpen, onClose]);
  const filtered = conversations.filter(c => c.title.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr")));
  const save = (id: string) => { if (title.trim()) onRename(id, title.trim()); setEditingId(null); };

  return <>
    {isOpen && <button className="sidebar-overlay md:hidden" aria-label="Fermer le menu" onClick={onClose} />}
    <aside ref={sidebarRef} className={cn("tiffy-sidebar", isOpen && "is-open")} aria-label="Conversations">
      <div className="sidebar-brand"><Link to="/" className="brand-link" aria-label="Tiffy, accueil"><img src="/tiffy-logo.svg" alt="" className="h-11 w-11 rounded-2xl border border-white/10" /><span className="brand-word">tiffy<span>.</span></span></Link><button ref={closeRef} className="sidebar-icon md:hidden" aria-label="Fermer le menu" onClick={onClose}><X className="h-5 w-5" /></button></div>
      <p className="sidebar-tagline">Un peu d’aide. Plein de possibilités.</p>
      <button className="new-chat-button" onClick={onNew}><Plus className="h-4 w-4" />Nouvelle conversation<ArrowUpRight className="ml-auto h-4 w-4" /></button>
      <label className="sidebar-search"><Search className="h-4 w-4" /><input aria-label="Rechercher une conversation" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />{search && <button aria-label="Effacer la recherche" onClick={() => setSearch("")}><X className="h-3 w-3" /></button>}</label>
      <div className="sidebar-section-label"><span>MES CONVERSATIONS</span><span>{conversations.length.toString().padStart(2, "0")}</span></div>
      <nav className="sidebar-history" aria-label="Historique">
        {isLoading ? <p className="sidebar-empty">Chargement des conversations…</p> : filtered.length === 0 ? <div className="sidebar-empty"><MessageSquare className="mx-auto mb-3 h-6 w-6" /><p>{search ? "Aucun résultat" : "Tout commence ici."}</p><span>{search ? "Essaie avec d’autres mots." : "Tes conversations trouveront leur place dans cet espace."}</span></div> : filtered.map(conv => (
          <div className={cn("history-row group", currentConversationId === conv.id && "active")} key={conv.id}>
            {editingId === conv.id ? <div className="history-edit"><input autoFocus aria-label="Nom de la conversation" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") save(conv.id); if (e.key === "Escape") setEditingId(null); }} /><button className="sidebar-icon" aria-label="Enregistrer le nom" onClick={() => save(conv.id)}><Check className="h-4 w-4" /></button></div> : <>
              <button className="history-select" onClick={() => onSelect(conv.id)} aria-current={currentConversationId === conv.id ? "true" : undefined}><MessageSquare className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0"><span className="block truncate">{conv.title}</span><small>{formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true, locale: fr })}</small></span></button>
              <div className="history-actions"><button className="sidebar-icon" aria-label={`Renommer ${conv.title}`} onClick={() => { setEditingId(conv.id); setTitle(conv.title); }}><Pencil className="h-3 w-3" /></button><button className="sidebar-icon" aria-label={`Supprimer ${conv.title}`} onClick={() => onDelete(conv.id)}><Trash2 className="h-3 w-3" /></button></div>
            </>}
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom"><div className="sidebar-inspiration"><span className="text-xl">✳</span><p>Une petite question.<br /><strong>De nouvelles perspectives.</strong></p></div><Link className="sidebar-settings" to="/settings"><span className="profile-monogram">T</span><span className="flex-1"><strong>Mon espace</strong><small>Personnaliser Tiffy</small></span><Settings className="h-4 w-4" /></Link></div>
    </aside>
  </>;
}
