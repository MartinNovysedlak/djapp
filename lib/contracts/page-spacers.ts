/**
 * In-editor page break spacers - transparent height only.
 * Visual page chrome (white sheets, gray desk gap) lives in React, not here.
 * Never persist spacers into saved template HTML / PDF.
 */

export const PAGE_SPACER_ATTR = "data-page-spacer";

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const PAGE_GAP_MM = 16;

export type PageMarginsMm = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type PageSettings = PageMarginsMm & {
  pageNumbers: boolean;
};

export const DEFAULT_MARGINS_MM: PageMarginsMm = {
  top: 25.4,
  right: 25.4,
  bottom: 25.4,
  left: 25.4,
};

export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  ...DEFAULT_MARGINS_MM,
  pageNumbers: true,
};

export function clampMarginMm(value: number): number {
  if (!Number.isFinite(value)) return 25.4;
  return Math.min(50, Math.max(8, Math.round(value * 10) / 10));
}

let cachedPxPerMm = 0;

export function measureMmInPx(mm: number): number {
  if (typeof document === "undefined") return mm * 3.7795;
  if (cachedPxPerMm <= 0) {
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:absolute;visibility:hidden;height:100mm;pointer-events:none;";
    document.body.appendChild(probe);
    const px = probe.offsetHeight;
    document.body.removeChild(probe);
    cachedPxPerMm = px > 0 ? px / 100 : 3.7795;
  }
  return cachedPxPerMm * mm;
}

export function stripPageSpacers(html: string): string {
  return html.replace(
    /<div[^>]*data-page-spacer[^>]*>[\s\S]*?<\/div>/gi,
    ""
  );
}

const MARGIN_COMMENT_RE = /<!--\s*dj-margins:(\{[\s\S]*?\})\s*-->/;

/** Reads margins + page-numbering preference from the saved template comment. */
export function parsePageSettingsFromHtml(html: string): PageSettings {
  const match = html.match(MARGIN_COMMENT_RE);
  if (!match) return { ...DEFAULT_PAGE_SETTINGS };
  try {
    const parsed = JSON.parse(match[1]) as Partial<PageSettings>;
    return {
      top: clampMarginMm(Number(parsed.top ?? DEFAULT_MARGINS_MM.top)),
      right: clampMarginMm(Number(parsed.right ?? DEFAULT_MARGINS_MM.right)),
      bottom: clampMarginMm(Number(parsed.bottom ?? DEFAULT_MARGINS_MM.bottom)),
      left: clampMarginMm(Number(parsed.left ?? DEFAULT_MARGINS_MM.left)),
      pageNumbers:
        parsed.pageNumbers === undefined ? true : !!parsed.pageNumbers,
    };
  } catch {
    return { ...DEFAULT_PAGE_SETTINGS };
  }
}

/** @deprecated use parsePageSettingsFromHtml — kept for margin-only call sites. */
export function parseMarginsFromHtml(html: string): PageMarginsMm {
  const { top, right, bottom, left } = parsePageSettingsFromHtml(html);
  return { top, right, bottom, left };
}

export function stripMarginsComment(html: string): string {
  return html.replace(MARGIN_COMMENT_RE, "").trim();
}

/** Persists margins + page-numbering preference as a leading HTML comment. */
export function embedPageSettingsComment(
  html: string,
  settings: PageSettings
): string {
  const clean = stripMarginsComment(html);
  const payload = JSON.stringify({
    top: settings.top,
    right: settings.right,
    bottom: settings.bottom,
    left: settings.left,
    pageNumbers: settings.pageNumbers,
  });
  return "<!--dj-margins:" + payload + "-->\n" + clean;
}

function createSpacer(heightMm: number): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute(PAGE_SPACER_ATTR, "true");
  el.contentEditable = "false";
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = [
    "display:block",
    "height:" + Math.max(0.1, heightMm) + "mm",
    "width:100%",
    "margin:0",
    "padding:0",
    "border:0",
    "background:transparent",
    "pointer-events:none",
    "user-select:none",
    "-webkit-user-select:none",
    "box-sizing:border-box",
    "overflow:hidden",
    "font-size:0",
    "line-height:0",
  ].join(";");
  return el;
}

function clearSpacers(editor: HTMLElement) {
  editor
    .querySelectorAll("[" + PAGE_SPACER_ATTR + "]")
    .forEach((node) => node.remove());
}

const BLOCK_TAGS = new Set([
  "p",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "table",
  "blockquote",
  "pre",
  "hr",
  "section",
  "article",
  "figure",
  "li",
]);

const WRAPPER_TAGS = new Set(["div", "section", "article"]);
const LIST_TAGS = new Set(["ul", "ol"]);

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === Node.ELEMENT_NODE;
}

function hasBlockLevelChildren(el: HTMLElement): boolean {
  for (const child of Array.from(el.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.hasAttribute(PAGE_SPACER_ATTR)) continue;
    if (BLOCK_TAGS.has(child.tagName.toLowerCase())) return true;
  }
  return false;
}

/**
 * Wraps stray text/inline nodes that sit directly inside a container (no <p>
 * around them — common contentEditable output) in a synthetic <p>, so the
 * pagination pass can see and measure them. Without this, loose text is
 * invisible to getFlowBlocks and silently drops out of the height budget,
 * which is what let content run past the page edge instead of breaking.
 */
function wrapLooseInlineContent(container: HTMLElement) {
  const isLoose = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) return true;
    if (!isElement(node)) return false;
    if (node.hasAttribute(PAGE_SPACER_ATTR)) return false;
    return !BLOCK_TAGS.has(node.tagName.toLowerCase());
  };

  const children = Array.from(container.childNodes);
  let run: Node[] = [];

  const flush = () => {
    if (run.length === 0) return;
    const hasContent = run.some((n) =>
      n.nodeType === Node.TEXT_NODE
        ? (n.textContent || "").trim().length > 0
        : true
    );
    const anchor = run[0];
    if (hasContent) {
      const p = document.createElement("p");
      container.insertBefore(p, anchor);
      run.forEach((n) => p.appendChild(n));
    } else {
      run.forEach((n) => n.remove());
    }
    run = [];
  };

  for (const node of children) {
    if (isLoose(node)) {
      run.push(node);
    } else {
      flush();
    }
  }
  flush();
}

/** Recursively normalizes loose content in the editor root and any nested wrapper. */
function normalizeLooseContent(container: HTMLElement) {
  wrapLooseInlineContent(container);
  for (const child of Array.from(container.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.hasAttribute(PAGE_SPACER_ATTR)) continue;
    if (WRAPPER_TAGS.has(child.tagName.toLowerCase())) {
      normalizeLooseContent(child);
    }
  }
}

function getFlowBlocks(editor: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];

  const walk = (parent: HTMLElement) => {
    for (const node of Array.from(parent.childNodes)) {
      if (!isElement(node)) continue;
      if (node.hasAttribute(PAGE_SPACER_ATTR)) continue;

      const tag = node.tagName.toLowerCase();

      if (WRAPPER_TAGS.has(tag) && hasBlockLevelChildren(node)) {
        walk(node);
        continue;
      }

      if (LIST_TAGS.has(tag)) {
        for (const child of Array.from(node.children)) {
          if (!(child instanceof HTMLElement)) continue;
          if (child.tagName.toLowerCase() !== "li") continue;
          if (child.hasAttribute(PAGE_SPACER_ATTR)) continue;
          out.push(child);
        }
        continue;
      }

      if (BLOCK_TAGS.has(tag)) {
        out.push(node);
      }
    }
  };

  walk(editor);
  return out;
}

function splitBlockByBr(block: HTMLElement) {
  if (!block.querySelector("br")) return;

  const html = block.innerHTML;
  // Empty contentEditable paragraphs are `<p><br></p>`. Splitting that on
  // `<br>` yields ["",""] and used to invent a second blank paragraph — the
  // "double Enter" bug. Leave lone placeholder breaks alone.
  if (/^\s*<br\s*\/?>\s*$/i.test(html)) return;

  const parts = html.split(/<br\s*\/?>/i);
  // Browsers often leave a trailing `<br>` after real content; don't turn
  // that into an extra empty sibling paragraph.
  while (parts.length > 1 && /^\s*$/.test(parts[parts.length - 1])) {
    parts.pop();
  }
  if (parts.length <= 1) return;

  const parent = block.parentElement;
  if (!parent) return;

  const tag = block.tagName.toLowerCase();
  const createTag = tag === "li" ? "li" : tag === "div" ? "p" : tag;

  block.innerHTML = parts[0] || "<br>";

  let ref: HTMLElement = block;
  for (let i = 1; i < parts.length; i++) {
    const el = document.createElement(createTag);
    el.innerHTML = parts[i] || "<br>";
    if (block.style.cssText) el.style.cssText = block.style.cssText;
    parent.insertBefore(el, ref.nextSibling);
    ref = el;
  }
}

function normalizeBrSplits(editor: HTMLElement) {
  const blocks = getFlowBlocks(editor);
  for (let i = blocks.length - 1; i >= 0; i--) {
    splitBlockByBr(blocks[i]);
  }
}

function constrainContentWidth(editor: HTMLElement) {
  for (const node of getFlowBlocks(editor)) {
    node.style.maxWidth = "100%";
    node.style.boxSizing = "border-box";
    node.style.overflowWrap = "anywhere";

    const ml = parseFloat(node.style.marginLeft);
    const mr = parseFloat(node.style.marginRight);
    const mt = parseFloat(node.style.marginTop);
    const mb = parseFloat(node.style.marginBottom);
    if (Number.isFinite(ml) && ml < 0) node.style.marginLeft = "0";
    if (Number.isFinite(mr) && mr < 0) node.style.marginRight = "0";
    if (Number.isFinite(mt) && mt < 0) node.style.marginTop = "0";
    if (Number.isFinite(mb) && mb < 0) node.style.marginBottom = "0";
  }
}

function applyEditorChrome(editor: HTMLElement, margins: PageMarginsMm) {
  editor.style.paddingTop = margins.top + "mm";
  editor.style.paddingBottom = margins.bottom + "mm";
  editor.style.paddingLeft = margins.left + "mm";
  editor.style.paddingRight = margins.right + "mm";
  editor.style.boxSizing = "border-box";
  editor.style.overflowX = "hidden";
}

/**
 * Pagination: measure real rendered block positions (not summed CSS margins,
 * which drift once adjacent margins collapse) and insert transparent spacers
 * so overflowing content physically lands on the next page's top margin.
 */
export function syncPageSpacers(
  editor: HTMLElement,
  margins: PageMarginsMm = DEFAULT_MARGINS_MM,
  gapMm: number = PAGE_GAP_MM
): number {
  clearSpacers(editor);
  applyEditorChrome(editor, margins);
  normalizeLooseContent(editor);
  normalizeBrSplits(editor);
  constrainContentWidth(editor);

  const pxPerMm = measureMmInPx(1);
  const contentH = Math.max(
    24,
    (A4_HEIGHT_MM - margins.top - margins.bottom) * pxPerMm
  );
  const breakZonePx = (margins.bottom + gapMm + margins.top) * pxPerMm;

  const blocks = getFlowBlocks(editor);
  if (blocks.length === 0) {
    editor.style.minHeight = A4_HEIGHT_MM + "mm";
    return 1;
  }

  // Force a layout flush so the rects below reflect the chrome/split/width
  // changes just applied, not a stale pre-mutation layout.
  void editor.offsetHeight;

  const editorTop = editor.getBoundingClientRect().top;
  const tops = blocks.map((b) => b.getBoundingClientRect().top - editorTop);
  const lastRect = blocks[blocks.length - 1].getBoundingClientRect();
  const contentEnd = lastRect.bottom - editorTop;

  const heights = tops.map((top, i) =>
    Math.max(1, i + 1 < tops.length ? tops[i + 1] - top : contentEnd - top)
  );

  let used = 0;
  const breaks: { index: number; heightPx: number }[] = [];

  for (let i = 0; i < heights.length; i++) {
    const h = heights[i];
    if (used > 0.5 && used + h > contentH + 0.5) {
      const remainingPx = Math.max(0, contentH - used);
      breaks.push({ index: i, heightPx: remainingPx + breakZonePx });
      used = h;
    } else {
      used += h;
    }
  }

  for (let b = breaks.length - 1; b >= 0; b--) {
    const br = breaks[b];
    const block = blocks[br.index];
    block.parentElement?.insertBefore(
      createSpacer(br.heightPx / pxPerMm),
      block
    );
  }

  const pages = breaks.length + 1;
  editor.style.minHeight =
    pages * A4_HEIGHT_MM + Math.max(0, pages - 1) * gapMm + "mm";
  return pages;
}
