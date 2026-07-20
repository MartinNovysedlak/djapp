const PLACEHOLDER_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;
const HIGHLIGHT_MARK = "data-ph-token";
/** Chip chrome only — weight/size/underline come from surrounding tags so DJ formatting is visible. */
const HIGHLIGHT_STYLE =
  "display:inline;background:rgba(37,99,235,0.14);color:#1d4ed8;border:1px solid rgba(37,99,235,0.28);border-radius:4px;padding:0 5px;font-family:inherit;font-size:inherit;font-weight:inherit;font-style:inherit;text-decoration:inherit;white-space:nowrap;";

function escapeAttr(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Wraps every `{{key}}` token in a chip that shows a human label (e.g. "Cena")
 * while keeping `data-ph-token="cena"` so the underlying key stays intact.
 * Surrounding `<strong>` / `<u>` / font-size spans are left untouched so PDF
 * formatting applied to the token survives edit ↔ save cycles.
 */
export function highlightPlaceholders(
  html: string,
  labelForKey: (key: string) => string = (key) => key
): string {
  return html.replace(PLACEHOLDER_RE, (_match, key: string) => {
    const trimmed = key.trim();
    const label = escapeHtml(labelForKey(trimmed) || trimmed);
    return `<span ${HIGHLIGHT_MARK}="${escapeAttr(trimmed)}" contenteditable="false" style="${HIGHLIGHT_STYLE}">${label}</span>`;
  });
}

const HIGHLIGHT_SPAN_RE =
  /<span[^>]*data-ph-token="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi;

/**
 * Restores canonical `{{key}}` tokens from the chip markup.
 * Uses the `data-ph-token` attribute (not the visible label text).
 * Parent wrappers (`<strong>`, `<em>`, `<u>`, font-size spans) stay in place.
 */
export function stripPlaceholderHighlights(html: string): string {
  return html.replace(HIGHLIGHT_SPAN_RE, (_match, key: string) => `{{${key}}}`);
}

export function isPlaceholderChip(node: Node | null): node is HTMLElement {
  return (
    !!node &&
    node.nodeType === Node.ELEMENT_NODE &&
    (node as HTMLElement).hasAttribute(HIGHLIGHT_MARK)
  );
}

/** Finds placeholder chips that intersect the current selection. */
export function findPlaceholderChipsInRange(
  range: Range,
  root: HTMLElement
): HTMLElement[] {
  const chips = Array.from(
    root.querySelectorAll(`[${HIGHLIGHT_MARK}]`)
  ) as HTMLElement[];
  return chips.filter((chip) => {
    try {
      return range.intersectsNode(chip);
    } catch {
      return false;
    }
  });
}

/** Chip under the caret when the selection is collapsed. */
export function findChipAtCaret(range: Range): HTMLElement | null {
  let node: Node | null = range.startContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  while (node && node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    if (el.hasAttribute(HIGHLIGHT_MARK)) return el;
    node = el.parentElement;
  }
  return null;
}
