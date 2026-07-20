import { parse, NodeType, type Node as ParsedNode, HTMLElement } from "node-html-parser";

export type TextAlign = "left" | "center" | "right" | "justify";

export type TextRun = {
  text: string;
  bold: boolean;
  italic: boolean;
  underline?: boolean;
  /** Font size in points, when the DJ (or the source .docx) set one explicitly. */
  fontSize?: number;
};

export type ContractBlock =
  | { kind: "paragraph"; runs: TextRun[]; align?: TextAlign }
  | { kind: "heading"; level: number; runs: TextRun[]; align?: TextAlign }
  | { kind: "listItem"; ordered: boolean; index: number; runs: TextRun[] }
  | { kind: "table"; rows: TextRun[][][] }
  | { kind: "spacer" };

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: "\u00a0",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  hellip: "\u2026",
  mdash: "\u2014",
  ndash: "\u2013",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201c",
  rdquo: "\u201d",
};

/**
 * node-html-parser exposes raw (undecoded) text on text nodes, so entities like
 * `&nbsp;` or `&amp;` show up literally in the extracted text unless we decode
 * them ourselves before they land in the PDF.
 */
function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, code: string) => {
    if (code[0] === "#") {
      const codePoint =
        code[1]?.toLowerCase() === "x"
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return NAMED_ENTITIES[code] ?? match;
  });
}

function readAlign(el: HTMLElement): TextAlign | undefined {
  const style = el.getAttribute("style") ?? "";
  const className = el.getAttribute("class") ?? "";
  if (
    /text-align\s*:\s*center/i.test(style) ||
    /\bdoc-center\b/.test(className)
  ) {
    return "center";
  }
  if (
    /text-align\s*:\s*right/i.test(style) ||
    /\bdoc-right\b/.test(className)
  ) {
    return "right";
  }
  if (
    /text-align\s*:\s*justify/i.test(style) ||
    /\bdoc-justify\b/.test(className)
  ) {
    return "justify";
  }
  return undefined;
}

function readFontSizePt(el: HTMLElement): number | undefined {
  const style = el.getAttribute("style") ?? "";
  const ptMatch = style.match(/font-size\s*:\s*([\d.]+)\s*pt/i);
  if (ptMatch) return parseFloat(ptMatch[1]);
  const pxMatch = style.match(/font-size\s*:\s*([\d.]+)\s*px/i);
  if (pxMatch) return parseFloat(pxMatch[1]) * 0.75;
  return undefined;
}

function collectRuns(
  node: ParsedNode,
  bold: boolean,
  italic: boolean,
  underline: boolean,
  fontSize: number | undefined,
  runs: TextRun[]
) {
  if (node.nodeType === NodeType.TEXT_NODE) {
    const text = decodeHtmlEntities(node.rawText).replace(/\s+/g, " ");
    if (text.trim().length > 0 || text.includes(" ")) {
      runs.push({ text, bold, italic, underline, fontSize });
    }
    return;
  }

  if (node.nodeType !== NodeType.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  const tag = el.tagName?.toLowerCase();

  if (tag === "br") {
    runs.push({ text: "\n", bold, italic, underline, fontSize });
    return;
  }

  const style = el.getAttribute("style") ?? "";
  const nextBold =
    bold ||
    tag === "strong" ||
    tag === "b" ||
    /font-weight\s*:\s*(bold|[6-9]00)/i.test(style);
  const nextItalic =
    italic ||
    tag === "em" ||
    tag === "i" ||
    /font-style\s*:\s*italic/i.test(style);
  const nextUnderline =
    underline ||
    tag === "u" ||
    /text-decoration\s*:[^;]*underline/i.test(style);
  const nextFontSize = readFontSizePt(el) ?? fontSize;

  for (const child of el.childNodes) {
    collectRuns(child, nextBold, nextItalic, nextUnderline, nextFontSize, runs);
  }
}

function runsFrom(el: ParsedNode): TextRun[] {
  const runs: TextRun[] = [];
  collectRuns(el, false, false, false, undefined, runs);
  return runs.filter((r) => r.text.length > 0);
}

function cellRunsFrom(cellEl: HTMLElement): TextRun[] {
  const runs: TextRun[] = [];
  const paragraphs = cellEl.childNodes.filter(
    (n) =>
      n.nodeType === NodeType.ELEMENT_NODE &&
      (n as HTMLElement).tagName?.toLowerCase() === "p"
  );
  const sources = paragraphs.length > 0 ? paragraphs : [cellEl];
  sources.forEach((p, i) => {
    if (i > 0) runs.push({ text: "\n", bold: false, italic: false });
    runs.push(...runsFrom(p));
  });
  return runs;
}

function tableFrom(tableEl: HTMLElement): ContractBlock {
  const rows: TextRun[][][] = [];
  const rowEls = tableEl.querySelectorAll("tr");
  for (const rowEl of rowEls) {
    const cellEls = rowEl.querySelectorAll("td, th");
    const cells = cellEls.map((cellEl) => cellRunsFrom(cellEl));
    if (cells.length > 0) rows.push(cells);
  }
  return { kind: "table", rows };
}

/**
 * Converts mammoth's HTML output into a flat list of simple blocks
 * (paragraphs, headings, lists, tables with bold/italic/underline/font-size runs)
 * that we can render with @react-pdf/renderer without needing a browser engine.
 */
export function htmlToBlocks(html: string): ContractBlock[] {
  const root = parse(html);
  const blocks: ContractBlock[] = [];

  function walk(node: ParsedNode) {
    if (node.nodeType !== NodeType.ELEMENT_NODE) {
      for (const child of node.childNodes) walk(child);
      return;
    }

    const el = node as HTMLElement;
    const tag = el.tagName?.toLowerCase();
    const align = readAlign(el);

    if (tag === "p") {
      const runs = runsFrom(el);
      if (runs.length === 0) {
        blocks.push({ kind: "spacer" });
      } else {
        blocks.push({ kind: "paragraph", runs, align });
      }
      return;
    }

    if (tag && HEADING_TAGS.has(tag)) {
      const runs = runsFrom(el);
      if (runs.length > 0) {
        blocks.push({ kind: "heading", level: Number(tag[1]), runs, align });
      }
      return;
    }

    if (tag === "table") {
      blocks.push(tableFrom(el));
      return;
    }

    if (tag === "ul" || tag === "ol") {
      const ordered = tag === "ol";
      let index = 1;
      for (const child of el.childNodes) {
        if (child.nodeType !== NodeType.ELEMENT_NODE) continue;
        const childEl = child as HTMLElement;
        if (childEl.tagName?.toLowerCase() !== "li") continue;
        const runs = runsFrom(childEl);
        if (runs.length > 0) {
          blocks.push({ kind: "listItem", ordered, index, runs });
          index += 1;
        }
      }
      return;
    }

    for (const child of el.childNodes) walk(child);
  }

  for (const child of root.childNodes) walk(child);
  return blocks;
}
