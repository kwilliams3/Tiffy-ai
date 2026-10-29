export interface CodeToken { text: string; kind?: "comment" | "string" | "keyword" | "number" | "key" | "tag" }
const languages: Record<string, string> = {
  js: "JavaScript", javascript: "JavaScript", jsx: "JSX", ts: "TypeScript", typescript: "TypeScript", tsx: "TSX",
  py: "Python", python: "Python", json: "JSON", css: "CSS", html: "HTML", xml: "XML", bash: "Bash", sh: "Shell", sql: "SQL",
};
const keywords = /^(?:const|let|var|function|return|async|await|if|else|for|while|class|new|import|export|from|default|try|catch|finally|throw|switch|case|break|continue|interface|type|extends|implements|public|private|def|elif|in|is|not|and|or|with|as|lambda|pass|yield|raise|except|print|True|False|None|true|false|null|undefined|SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|JOIN|ON|ORDER|BY|GROUP|LIMIT|CREATE|TABLE)$/;

export function highlightCode(code: string, language: string): CodeToken[] {
  const name = language.toLowerCase();
  if (!languages[name] || code.length > 50_000) return [{ text: code }];
  const shell = ["py", "python", "bash", "sh"].includes(name);
  const html = ["html", "xml"].includes(name);
  const comments = html ? "<!--[\\s\\S]*?-->" : shell ? "#[^\\n]*" : "//[^\\n]*|/\\*[\\s\\S]*?\\*/";
  const pattern = new RegExp(`(${comments})|("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\x60(?:\\\\.|[^\x60\\\\])*\x60)|(\\b\\d+(?:\\.\\d+)?\\b)|(${html ? "</?[a-zA-Z][\\w:-]*|/?>" : "[a-zA-Z_$][\\w$]*"})`, "g");
  const tokens: CodeToken[] = [];
  let cursor = 0;
  for (const match of code.matchAll(pattern)) {
    const index = match.index!;
    if (index > cursor) tokens.push({ text: code.slice(cursor, index) });
    const text = match[0];
    const after = code.slice(index + text.length);
    const kind = match[1] ? "comment" : match[2] ? (/^\s*:/.test(after) && name === "json" ? "key" : "string") : match[3] ? "number" : html ? "tag" : keywords.test(text) ? "keyword" : undefined;
    tokens.push({ text, kind });
    cursor = index + text.length;
  }
  if (cursor < code.length) tokens.push({ text: code.slice(cursor) });
  return tokens;
}
export function codeLanguage(language: string) { return languages[language.toLowerCase()] || language || "Code"; }
