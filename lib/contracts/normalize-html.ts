import { stripPageSpacers, stripMarginsComment } from "./page-spacers";

/**
 * contentEditable (especially Chrome) often emits `<div>` instead of `<p>` for
 * new lines. Normalize those to `<p>` so saved HTML stays Word-like and prints
 * consistently in the PDF engine.
 */
export function normalizeContractHtml(html: string): string {
  // Drop editor-only page break spacers before any tag rewriting.
  let out = stripPageSpacers(html);

  // Strip leftover editor chrome if any slipped through.
  out = out.replace(/\scontenteditable="[^"]*"/gi, "");

  // Convert top-level / nested bare divs that only wrap text/inline content into <p>.
  out = out.replace(/<div(\s[^>]*)?>/gi, (full, attrs: string = "") => {
    if (/data-page-spacer/i.test(full)) return full;
    return `<p${attrs}>`;
  });
  out = out.replace(/<\/div>/gi, "</p>");
  out = stripPageSpacers(out);

  // Empty paragraphs from blank lines.
  out = out.replace(/<p(\s[^>]*)?>\s*<br\s*\/?>\s*<\/p>/gi, "<p$1><br></p>");

  // Collapse accidental nested <p><p>…</p></p> from double conversion.
  out = out.replace(/<p(\s[^>]*)?>\s*<p(\s[^>]*)?>/gi, "<p$1>");
  out = out.replace(/<\/p>\s*<\/p>/gi, "</p>");

  return out;
}

/** HTML ready for PDF — no editor chrome, no margin comment. */
export function normalizeContractHtmlForPdf(html: string): string {
  return stripMarginsComment(normalizeContractHtml(html));
}
