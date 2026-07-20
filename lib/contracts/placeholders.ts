const PLACEHOLDER_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

/** Finds every unique `{{placeholder}}` key in a template's HTML/text, in first-seen order. */
export function extractPlaceholders(content: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of content.matchAll(PLACEHOLDER_RE)) {
    const key = match[1]?.trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

/** Turns a DJ-typed label like "Výška zálohy" into a safe `{{vyska_zalohy}}` key. */
export function slugifyPlaceholderKey(label: string): string {
  const slug = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "pole";
}

/** Appends a numeric suffix until the key doesn't collide with an existing one. */
export function uniquePlaceholderKey(
  baseKey: string,
  existingKeys: Iterable<string>
): string {
  const taken = new Set(existingKeys);
  if (!taken.has(baseKey)) return baseKey;
  let n = 2;
  while (taken.has(`${baseKey}_${n}`)) n += 1;
  return `${baseKey}_${n}`;
}
