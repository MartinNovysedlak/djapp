/**
 * Shared Word-like document stylesheet used by both the contentEditable editor
 * and the Chromium PDF print path — so what the DJ sees is what gets printed.
 *
 * Page size/margins are intentionally NOT set here via `@page` — Chromium's
 * print-to-PDF engine only reliably honors margins passed to `page.pdf()`'s
 * `margin` option, not CSS `@page { margin }`. See `lib/contracts/pdf.ts`.
 */
export function buildContractDocumentCss(): string {
  return `
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
  }
  body {
    font-family: Calibri, "Segoe UI", Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.15;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .contract-body {
    width: 100%;
  }
  p {
    margin: 0;
    min-height: 1.15em;
    line-height: 1.15;
  }
  h1 { margin: 12pt 0; font-size: 16pt; font-weight: 700; line-height: 1.2; }
  h2 { margin: 10pt 0; font-size: 14pt; font-weight: 700; line-height: 1.2; }
  h3 { margin: 8pt 0; font-size: 12pt; font-weight: 700; line-height: 1.2; }
  h4 { margin: 6pt 0; font-size: 11pt; font-weight: 700; }
  .doc-title { font-size: 18pt; font-weight: 700; text-align: center; }
  .doc-subtitle { font-size: 12pt; font-style: italic; text-align: center; }
  .doc-center, [style*="text-align:center"], [style*="text-align: center"] { text-align: center; }
  .doc-right, [style*="text-align:right"], [style*="text-align: right"] { text-align: right; }
  .doc-justify, [style*="text-align:justify"], [style*="text-align: justify"] { text-align: justify; }
  ul { margin: 6pt 0; padding-left: 36pt; list-style: disc; }
  ol { margin: 6pt 0; padding-left: 36pt; list-style: decimal; }
  li { margin: 0; line-height: 1.15; }
  table { margin: 8pt 0; width: 100%; border-collapse: collapse; }
  td, th {
    border: 1px solid #000;
    padding: 2pt 4pt;
    vertical-align: top;
  }
  th { font-weight: 700; }
  strong, b { font-weight: 700; }
  em, i { font-style: italic; }
  u { text-decoration: underline; }
  s { text-decoration: line-through; }
  blockquote {
    margin: 8pt 0;
    padding-left: 12pt;
    border-left: 2px solid rgba(0,0,0,0.25);
  }
`;
}

/** @deprecated use buildContractDocumentCss — kept for any direct imports */
export const CONTRACT_DOCUMENT_CSS = buildContractDocumentCss();

/** Wraps resolved contract body HTML in a full printable document (no page margins — see pdf.ts). */
export function wrapContractDocumentHtml(bodyHtml: string, title = "Zmluva"): string {
  const safeTitle = title
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>${buildContractDocumentCss()}</style>
</head>
<body>
  <div class="contract-body">${bodyHtml}</div>
</body>
</html>`;
}
