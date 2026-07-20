import mammoth from "mammoth";
import JSZip from "jszip";
import {
  clampMarginMm,
  DEFAULT_MARGINS_MM,
  DEFAULT_PAGE_SETTINGS,
  embedPageSettingsComment,
  type PageMarginsMm,
} from "@/lib/contracts/page-spacers";

type ParagraphIndent = {
  start?: string | null;
  end?: string | null;
  firstLine?: string | null;
  hanging?: string | null;
};

type ParagraphNode = {
  alignment?: string | null;
  styleName?: string | null;
  indent?: ParagraphIndent | null;
};

type RunNode = {
  styleName?: string | null;
  fontSize?: number | null;
};

// mammoth.transforms exists at runtime but is missing from the public .d.ts
const mammothTransforms = (
  mammoth as unknown as {
    transforms: {
      paragraph: (
        fn: (paragraph: ParagraphNode) => unknown
      ) => (element: unknown) => unknown;
      run: (fn: (run: RunNode) => unknown) => (element: unknown) => unknown;
    };
  }
).transforms;

const BASE_STYLE_MAP = [
  "p[style-name='Title'] => h1.doc-title:fresh",
  "p[style-name='Subtitle'] => p.doc-subtitle:fresh",
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Nadpis'] => h1:fresh",
  "p[style-name='Nadpis 1'] => h1:fresh",
  "p[style-name='Nadpis 2'] => h2:fresh",
  "p[style-name='Nadpis 3'] => h3:fresh",
  "p[style-name='doc-align-center'] => p.doc-center:fresh",
  "p[style-name='doc-align-right'] => p.doc-right:fresh",
  "p[style-name='doc-align-justify'] => p.doc-justify:fresh",
  "p[style-name='Heading 1 doc-align-center'] => h1.doc-center:fresh",
  "p[style-name='Heading 2 doc-align-center'] => h2.doc-center:fresh",
  "p[style-name='Heading 3 doc-align-center'] => h3.doc-center:fresh",
  "p[style-name='Title doc-align-center'] => h1.doc-title.doc-center:fresh",
  "p[style-name='Heading 1 doc-align-right'] => h1.doc-right:fresh",
  "p[style-name='Heading 2 doc-align-right'] => h2.doc-right:fresh",
  "p[style-name='Heading 3 doc-align-right'] => h3.doc-right:fresh",
  "p[style-name='Heading 1 doc-align-justify'] => h1.doc-justify:fresh",
  "p[style-name='Heading 2 doc-align-justify'] => h2.doc-justify:fresh",
  "r[style-name='Strong'] => strong",
  "r[style-name='Emphasis'] => em",
  "u => u",
  "strike => s",
  "b => strong",
  "i => em",
  // Word highlight colors -> inline background so review markup survives conversion.
  "highlight[color='yellow'] => span[style='background-color:#ffff00']",
  "highlight[color='green'] => span[style='background-color:#00ff00']",
  "highlight[color='cyan'] => span[style='background-color:#00ffff']",
  "highlight[color='magenta'] => span[style='background-color:#ff00ff']",
  "highlight[color='blue'] => span[style='background-color:#0000ff;color:#fff']",
  "highlight[color='red'] => span[style='background-color:#ff0000;color:#fff']",
  "highlight[color='darkBlue'] => span[style='background-color:#00008b;color:#fff']",
  "highlight[color='darkCyan'] => span[style='background-color:#008b8b;color:#fff']",
  "highlight[color='darkGreen'] => span[style='background-color:#006400;color:#fff']",
  "highlight[color='darkMagenta'] => span[style='background-color:#8b008b;color:#fff']",
  "highlight[color='darkRed'] => span[style='background-color:#8b0000;color:#fff']",
  "highlight[color='darkYellow'] => span[style='background-color:#808000;color:#fff']",
  "highlight[color='darkGray'] => span[style='background-color:#a9a9a9']",
  "highlight[color='lightGray'] => span[style='background-color:#d3d3d3']",
  "highlight[color='black'] => span[style='background-color:#000000;color:#fff']",
  "highlight[color='white'] => span[style='background-color:#ffffff']",
];

function alignmentSuffix(alignment: string | null | undefined): string | null {
  if (!alignment) return null;
  const a = alignment.toLowerCase();
  if (a === "center" || a === "centre") return "doc-align-center";
  if (a === "right" || a === "end") return "doc-align-right";
  if (a === "both" || a === "justify") return "doc-align-justify";
  return null;
}

/** OOXML indent units are twentieths of a point (dxa) — convert to pt, rounded to 0.5pt. */
function dxaToPt(raw?: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n === 0) return null;
  return Math.round((n / 20) * 2) / 2;
}

function encodeNumber(n: number): string {
  const scaled = Math.round(n * 10);
  return (scaled < 0 ? "n" : "") + Math.abs(scaled);
}

function decodeNumber(token: string): number {
  const neg = token.startsWith("n");
  const digits = neg ? token.slice(1) : token;
  const scaled = Number(digits);
  return (neg ? -scaled : scaled) / 10;
}

/** Indent suffix tokens — only meaningful for plain body paragraphs (no named Word style). */
function indentSuffixParts(indent?: ParagraphIndent | null): string[] {
  if (!indent) return [];
  const parts: string[] = [];
  const start = dxaToPt(indent.start);
  const end = dxaToPt(indent.end);
  const firstLine = dxaToPt(indent.firstLine);
  const hanging = dxaToPt(indent.hanging);
  if (start) parts.push("doc-ind-s" + encodeNumber(start));
  if (end) parts.push("doc-ind-e" + encodeNumber(end));
  if (firstLine) parts.push("doc-ind-fl" + encodeNumber(firstLine));
  if (hanging) parts.push("doc-ind-hg" + encodeNumber(hanging));
  return parts;
}

function fontSizeSuffix(fontSize?: number | null): string | null {
  if (!fontSize || fontSize <= 0) return null;
  return "doc-fs-" + encodeNumber(Math.round(fontSize * 2) / 2);
}

function composeStyleName(
  base: string | null | undefined,
  extra: (string | null)[]
): string | null {
  const parts = [base?.trim() || null, ...extra].filter(Boolean) as string[];
  return parts.length ? parts.join(" ") : null;
}

/** Only add indent info to plain (unnamed-style) paragraphs — headings/titles keep their static mapping. */
function paragraphDynamicExtras(paragraph: ParagraphNode): string[] {
  const align = alignmentSuffix(paragraph.alignment);
  if (paragraph.styleName) return align ? [align] : [];
  return [align, ...indentSuffixParts(paragraph.indent)].filter(
    Boolean
  ) as string[];
}

function escapeStyleNameLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** Turns a raw combined style-name (space separated tokens) into `.a.b.c` DSL class syntax. */
function classSelectorFor(styleName: string): string {
  return "." + styleName.split(/\s+/).filter(Boolean).join(".");
}

/**
 * Runs mammoth once purely to discover which dynamic (font-size / indent)
 * style-name combinations actually occur in this document, so we can register
 * exact style-map entries for them before the real conversion. mammoth's
 * style-map only supports literal matches, so unseen combinations can't be
 * pre-declared for a continuous value space — we scan first instead.
 */
async function collectDynamicStyleNames(buffer: Buffer): Promise<{
  paragraphNames: Set<string>;
  runNames: Set<string>;
}> {
  const paragraphNames = new Set<string>();
  const runNames = new Set<string>();

  const paragraphCollector = mammothTransforms.paragraph((paragraph) => {
    const extra = paragraphDynamicExtras(paragraph);
    if (extra.length > 0) {
      const combined = composeStyleName(paragraph.styleName, extra);
      if (combined) paragraphNames.add(combined);
    }
    return paragraph;
  });

  const runCollector = mammothTransforms.run((run) => {
    const suffix = fontSizeSuffix(run.fontSize);
    if (suffix) {
      const combined = composeStyleName(run.styleName, [suffix]);
      if (combined) runNames.add(combined);
    }
    return run;
  });

  await mammoth.convertToHtml(
    { buffer },
    {
      transformDocument: (doc: unknown) =>
        runCollector(paragraphCollector(doc)),
    }
  );

  return { paragraphNames, runNames };
}

function buildDynamicStyleMap(
  paragraphNames: Set<string>,
  runNames: Set<string>
): string[] {
  const entries: string[] = [];
  for (const name of paragraphNames) {
    const escaped = escapeStyleNameLiteral(name);
    entries.push(
      `p[style-name='${escaped}'] => p${classSelectorFor(name)}:fresh`
    );
  }
  for (const name of runNames) {
    const escaped = escapeStyleNameLiteral(name);
    entries.push(`r[style-name='${escaped}'] => span${classSelectorFor(name)}`);
  }
  return entries;
}

/**
 * Converts mammoth's alignment / indent / font-size marker classes into inline
 * styles so the HTML looks the same in the editor and in PDF regardless of
 * which stylesheet is attached.
 */
function inlineDecorationStyles(html: string): string {
  const re = /<(p|h[1-6]|span)([^>]*?)\sclass="([^"]*)"([^>]*)>/gi;
  return html.replace(re, (full, tag: string, pre: string, cls: string, post: string) => {
    const tokens = cls.split(/\s+/).filter(Boolean);
    const styles: string[] = [];
    let matched = false;

    for (const token of tokens) {
      if (token === "doc-align-center") {
        styles.push("text-align:center");
        matched = true;
      } else if (token === "doc-align-right") {
        styles.push("text-align:right");
        matched = true;
      } else if (token === "doc-align-justify") {
        styles.push("text-align:justify");
        matched = true;
      } else if (token.startsWith("doc-ind-s")) {
        styles.push(`margin-left:${decodeNumber(token.slice(9))}pt`);
        matched = true;
      } else if (token.startsWith("doc-ind-e")) {
        styles.push(`margin-right:${decodeNumber(token.slice(9))}pt`);
        matched = true;
      } else if (token.startsWith("doc-ind-fl")) {
        styles.push(`text-indent:${decodeNumber(token.slice(10))}pt`);
        matched = true;
      } else if (token.startsWith("doc-ind-hg")) {
        styles.push(`text-indent:-${decodeNumber(token.slice(10))}pt`);
        matched = true;
      } else if (token.startsWith("doc-fs-")) {
        styles.push(`font-size:${decodeNumber(token.slice(7))}pt`);
        matched = true;
      }
    }

    if (!matched) return full;
    const attrs = `${pre} class="${cls}"${post}`.replace(/\sstyle="[^"]*"/i, "");
    return `<${tag}${attrs} style="${styles.join(";")}">`;
  });
}

/** OOXML page margins are in twips (1/20 pt). 1440 twips = 1 inch = 25.4 mm. */
function twipsToMm(twips: number): number {
  return (twips * 25.4) / 1440;
}

function readPgMarAttr(attrs: string, names: string[]): number | null {
  for (const name of names) {
    const match = attrs.match(new RegExp(`\\bw:${name}="(-?\\d+)"`, "i"));
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/**
 * Reads page margins from the final `w:sectPr` / `w:pgMar` in word/document.xml.
 * Falls back to Word-like defaults (2.54 cm) when the file has no section margins.
 */
export async function extractDocxPageMargins(
  buffer: Buffer
): Promise<PageMarginsMm> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file("word/document.xml")?.async("string");
    if (!docXml) return { ...DEFAULT_MARGINS_MM };

    const re = /<w:pgMar\b([^>]*?)\/?>/gi;
    let match: RegExpExecArray | null;
    let lastAttrs = "";
    while ((match = re.exec(docXml)) !== null) {
      lastAttrs = match[1] ?? "";
    }
    if (!lastAttrs) return { ...DEFAULT_MARGINS_MM };

    const topTwips = readPgMarAttr(lastAttrs, ["top"]);
    const bottomTwips = readPgMarAttr(lastAttrs, ["bottom"]);
    const leftTwips = readPgMarAttr(lastAttrs, ["left", "start"]);
    const rightTwips = readPgMarAttr(lastAttrs, ["right", "end"]);

    return {
      top:
        topTwips != null
          ? clampMarginMm(twipsToMm(topTwips))
          : DEFAULT_MARGINS_MM.top,
      bottom:
        bottomTwips != null
          ? clampMarginMm(twipsToMm(bottomTwips))
          : DEFAULT_MARGINS_MM.bottom,
      left:
        leftTwips != null
          ? clampMarginMm(twipsToMm(leftTwips))
          : DEFAULT_MARGINS_MM.left,
      right:
        rightTwips != null
          ? clampMarginMm(twipsToMm(rightTwips))
          : DEFAULT_MARGINS_MM.right,
    };
  } catch {
    return { ...DEFAULT_MARGINS_MM };
  }
}

/** Converts a .docx buffer into semantic HTML that keeps Word structure, alignment, indent and sizing. */
export async function convertDocxToHtml(buffer: Buffer): Promise<string> {
  const { paragraphNames, runNames } = await collectDynamicStyleNames(buffer);
  const styleMap = [...BASE_STYLE_MAP, ...buildDynamicStyleMap(paragraphNames, runNames)];

  const { value } = await mammoth.convertToHtml(
    { buffer },
    {
      ignoreEmptyParagraphs: false,
      styleMap,
      transformDocument: (doc: unknown) => {
        const paragraphTransform = mammothTransforms.paragraph((paragraph) => {
          const extra = paragraphDynamicExtras(paragraph);
          const combined = composeStyleName(paragraph.styleName, extra);
          if (!combined || combined === paragraph.styleName) return paragraph;
          return { ...paragraph, styleName: combined };
        });
        const runTransform = mammothTransforms.run((run) => {
          const suffix = fontSizeSuffix(run.fontSize);
          if (!suffix) return run;
          const combined = composeStyleName(run.styleName, [suffix]);
          if (!combined) return run;
          return { ...run, styleName: combined };
        });
        return runTransform(paragraphTransform(doc));
      },
    }
  );

  return inlineDecorationStyles(value);
}

/**
 * Full upload path: HTML body + page margins from the original Word section
 * properties, persisted as the `dj-margins` comment the editor/PDF already read.
 */
export async function convertDocxToTemplateHtml(
  buffer: Buffer
): Promise<string> {
  const [html, margins] = await Promise.all([
    convertDocxToHtml(buffer),
    extractDocxPageMargins(buffer),
  ]);
  return embedPageSettingsComment(html, {
    ...margins,
    pageNumbers: DEFAULT_PAGE_SETTINGS.pageNumbers,
  });
}
