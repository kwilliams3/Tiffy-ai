import { useMemo } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { highlightCode, codeLanguage } from "@/lib/code-highlight";

export function CodeBlock({ code, language }: { code: string; language: string }) {
  const tokens = useMemo(() => highlightCode(code, language), [code, language]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); toast.success("Code copié !"); }
    catch { toast.error("La copie n’est pas disponible dans ce navigateur."); }
  };
  return <div className="code-panel"><div className="code-panel-toolbar"><span>{codeLanguage(language)}</span><button onClick={copy} aria-label="Copier le bloc de code"><Copy className="h-3 w-3" />Copier le code</button></div><pre tabIndex={0} aria-label={`Code ${codeLanguage(language)}`}><code>{tokens.map((token, index) => token.kind ? <span className={`syntax-${token.kind}`} key={index}>{token.text}</span> : token.text)}</code></pre></div>;
}
