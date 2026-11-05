// How the command palette matches a search: every word typed must appear in
// the command's text or keywords. cmdk's default fuzzy match also accepts
// letters scattered across a command ("undo" matching "cUstom raNge… Dates
// frOm") and could rank that above the command named Undo.

/** cmdk filter: 1 when every search word is in the command, else 0 (hidden). */
export function matchCommand(
  value: string,
  search: string,
  keywords: readonly string[] = [],
): number {
  const text = [value, ...keywords].join(' ').toLowerCase();
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  return words.every((w) => text.includes(w)) ? 1 : 0;
}
