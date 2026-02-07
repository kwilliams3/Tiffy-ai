import { useState } from "react";
import { MessageSquare, Plus, Trash2, X, Pencil, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}
import { fr } from "date-fns/locale";
import tiffyLogo from "@/assets/tiffy-logo.png";

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  isLoading,
  isOpen,
  onClose,
  onSelect,
  onNew,
  onDelete,
  onRename,
}: ConversationSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const startEditing = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveEdit = (id: string) => {
    if (editTitle.trim()) {
      onRename(id, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-50 w-80 bg-card/95 backdrop-blur-xl border-r border-border/50 flex flex-col transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center gap-3 p-5 border-b border-border/50">
          <img src={tiffyLogo} alt="Tiffy" className="h-10 w-10 rounded-xl ai-glow" />
          <div className="flex-1">
            <h2 className="font-semibold text-foreground flex items-center gap-1.5">
              Tiffy
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </h2>
            <p className="text-xs text-muted-foreground">Assistant IA</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onNew}
              className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 rounded-xl md:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {isLoading ? (
            <div className="space-y-3 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted/50 rounded-xl shimmer" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                <MessageSquare className="h-8 w-8 opacity-50" />
              </div>
              <p className="font-medium">Aucune conversation</p>
              <p className="text-xs mt-1">Commence à discuter avec Tiffy !</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-muted/80",
                  currentConversationId === conv.id
                    ? "bg-primary/10 border border-primary/20"
                    : ""
                )}
                onClick={() => editingId !== conv.id && onSelect(conv.id)}
              >
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                  currentConversationId === conv.id
                    ? "bg-primary/20 text-primary"
                    : "bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
                )}>
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  {editingId === conv.id ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(conv.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="h-8 text-sm input-modern"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveEdit(conv.id);
                        }}
                      >
                        <Check className="h-3 w-3 text-primary" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className={cn(
                        "text-sm font-medium truncate",
                        currentConversationId === conv.id ? "text-primary" : "text-foreground"
                      )}>{conv.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conv.updated_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </>
                  )}
                </div>
                {editingId !== conv.id && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg hover:bg-muted"
                      onClick={(e) => startEditing(conv, e)}
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(conv.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
