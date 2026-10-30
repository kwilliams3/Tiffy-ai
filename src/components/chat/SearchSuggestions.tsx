export function SearchSuggestions({ html }: { html?: string }) {
  if (!html || typeof html !== "string") return null;
  const document = `<meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; base-uri 'none'; form-action 'none'"><base target="_blank">${html.slice(0, 50_000)}`;
  return <iframe title="Suggestions Google Search" className="search-suggestions" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" srcDoc={document} />;
}
