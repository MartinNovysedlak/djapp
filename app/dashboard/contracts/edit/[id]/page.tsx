"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  CircleHelp,
  GripVertical,
  Italic,
  Link2,
  Loader2,
  Plus,
  Save,
  TextCursorInput,
  Underline,
  UserRound,
  Variable,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Reveal } from "@/components/motion";
import { useDashboardUser } from "@/components/DashboardUserContext";
import { WordDocumentEditor } from "@/components/contracts/WordDocumentEditor";
import { useToast } from "@/lib/toast-context";
import {
  getContractPlaceholders,
  getContractTemplate,
  saveContractTemplate,
} from "@/app/actions/contracts";
import {
  CONTRACT_SOURCE_FIELDS,
  getAutoFieldLabel,
  getPlaceholderDisplayLabel,
} from "@/lib/contracts/fields";
import {
  extractPlaceholders,
  slugifyPlaceholderKey,
  uniquePlaceholderKey,
} from "@/lib/contracts/placeholders";
import {
  findChipAtCaret,
  findPlaceholderChipsInRange,
  highlightPlaceholders,
  stripPlaceholderHighlights,
} from "@/lib/contracts/highlight";
import { normalizeContractHtml } from "@/lib/contracts/normalize-html";
import {
  DEFAULT_MARGINS_MM,
  embedPageSettingsComment,
  parsePageSettingsFromHtml,
  stripMarginsComment,
  type PageMarginsMm,
} from "@/lib/contracts/page-spacers";
import type {
  ContractPlaceholderRow,
  ContractTemplateRow,
} from "@/lib/contracts/types";

type PlaceholderHint = Pick<
  ContractPlaceholderRow,
  "type" | "source_field" | "label"
>;

type ManualPaletteItem = {
  key: string;
  label: string;
};

/**
 * Suggested manual fields every template starts with — price always needs the
 * DJ's input since it isn't reliably stored on a booking, so it's never offered
 * as an "automatic" (database) field.
 */
const DEFAULT_MANUAL_SUGGESTIONS: ManualPaletteItem[] = [
  { key: "cena", label: "Cena" },
  { key: "zaloha", label: "Výška zálohy" },
];

function makeEmptyPlaceholder(
  templateId: string,
  key: string,
  hint?: PlaceholderHint
): ContractPlaceholderRow {
  const now = new Date().toISOString();
  const type = hint?.type ?? "manual_input";
  const source_field = type === "database_field" ? hint?.source_field ?? null : null;
  const label =
    type === "manual_input" || type === "client_input"
      ? hint?.label?.trim() ||
        getPlaceholderDisplayLabel({
          placeholder_key: key,
          label: hint?.label ?? null,
          source_field,
        })
      : null;
  return {
    id: `new:${key}`,
    template_id: templateId,
    placeholder_key: key,
    type,
    source_field,
    label,
    created_at: now,
    updated_at: now,
  };
}

type CaretDoc = Document & {
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
  caretPositionFromPoint?: (
    x: number,
    y: number
  ) => { offsetNode: Node; offset: number } | null;
};

function rangeFromPoint(x: number, y: number): Range | null {
  const doc = document as CaretDoc;
  if (doc.caretRangeFromPoint) return doc.caretRangeFromPoint(x, y);
  if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(x, y);
    if (!pos) return null;
    const range = document.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    range.collapse(true);
    return range;
  }
  return null;
}

function insertTextAtRange(range: Range, text: string) {
  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.collapse(true);
}

/** Exact point sizes the DJ can apply (Word-like). */
const FONT_SIZE_PT = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 36] as const;

/**
 * A simple contentEditable toolbar. `onMouseDown` calls `preventDefault` so the
 * browser never blurs the editor before the click fires — otherwise the current
 * selection (and any pending formatting command) would be lost.
 */
function ToolbarButton({
  icon: Icon,
  label,
  title,
  active,
  onClick,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;
  title: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors ${
        active
          ? "bg-violet-500/25 text-violet-100"
          : "text-zinc-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {Icon ? <Icon className="size-3.5" /> : null}
      {label}
    </button>
  );
}

function wrapTagName(command: "bold" | "italic" | "underline"): "strong" | "em" | "u" {
  if (command === "bold") return "strong";
  if (command === "italic") return "em";
  return "u";
}

/** Toggle `<strong>` / `<em>` / `<u>` around a placeholder chip (contenteditable=false). */
function toggleChipWrap(chip: HTMLElement, tag: "strong" | "em" | "u") {
  const parent = chip.parentElement;
  if (
    parent &&
    parent.tagName.toLowerCase() === tag &&
    parent.childNodes.length === 1
  ) {
    parent.replaceWith(chip);
    return;
  }
  const wrap = document.createElement(tag);
  chip.replaceWith(wrap);
  wrap.appendChild(chip);
}

/** Apply an exact pt size to a chip by wrapping/updating a font-size span. */
function applyChipFontSize(chip: HTMLElement, pt: number) {
  const parent = chip.parentElement;
  if (
    parent &&
    parent.tagName.toLowerCase() === "span" &&
    parent.style.fontSize &&
    parent.childNodes.length === 1 &&
    !parent.hasAttribute("data-ph-token")
  ) {
    parent.style.fontSize = `${pt}pt`;
    return;
  }
  const span = document.createElement("span");
  span.style.fontSize = `${pt}pt`;
  chip.replaceWith(span);
  span.appendChild(chip);
}

function applyFontSizeToSelection(pt: number) {
  document.execCommand("fontSize", false, "7");
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const root =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as HTMLElement)
      : range.commonAncestorContainer.parentElement;
  if (!root) return;
  const fonts = root.querySelectorAll("font[size='7']");
  fonts.forEach((font) => {
    const span = document.createElement("span");
    span.style.fontSize = `${pt}pt`;
    span.innerHTML = (font as HTMLElement).innerHTML;
    font.replaceWith(span);
  });
}

/** Word-like typography — avoids Tailwind `prose` which rewrites document styles. */
const EDITOR_CLASS =
  "contract-editor max-w-none outline-none " +
  "[&_p]:my-0 [&_p]:min-h-[1.15em] [&_p]:leading-[1.15] " +
  "[&_h1]:my-[12pt] [&_h1]:text-[16pt] [&_h1]:font-bold [&_h1]:leading-[1.2] " +
  "[&_h2]:my-[10pt] [&_h2]:text-[14pt] [&_h2]:font-bold [&_h2]:leading-[1.2] " +
  "[&_h3]:my-[8pt] [&_h3]:text-[12pt] [&_h3]:font-bold [&_h3]:leading-[1.2] " +
  "[&_h4]:my-[6pt] [&_h4]:text-[11pt] [&_h4]:font-bold " +
  "[&_.doc-title]:text-[18pt] [&_.doc-title]:font-bold [&_.doc-title]:text-center " +
  "[&_.doc-subtitle]:text-[12pt] [&_.doc-subtitle]:italic [&_.doc-subtitle]:text-center " +
  "[&_.doc-center]:text-center [&_.doc-right]:text-right [&_.doc-justify]:text-justify " +
  "[&_ul]:my-[6pt] [&_ul]:list-disc [&_ul]:pl-[36pt] " +
  "[&_ol]:my-[6pt] [&_ol]:list-decimal [&_ol]:pl-[36pt] " +
  "[&_li]:my-0 [&_li]:leading-[1.15] " +
  "[&_table]:my-[8pt] [&_table]:w-full [&_table]:max-w-full [&_table]:border-collapse " +
  "[&_td]:border [&_td]:border-black [&_td]:px-[4pt] [&_td]:py-[2pt] [&_td]:align-top " +
  "[&_th]:border [&_th]:border-black [&_th]:px-[4pt] [&_th]:py-[2pt] [&_th]:font-bold " +
  "[&_img]:max-w-full [&_img]:h-auto " +
  "[&_*]:max-w-full " +
  "[&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic " +
  "[&_u]:underline [&_s]:line-through " +
  "[&_blockquote]:my-[8pt] [&_blockquote]:border-l-2 [&_blockquote]:border-black/25 [&_blockquote]:pl-[12pt]";

export default function EditContractTemplatePage() {
  const params = useParams();
  const templateId = params.id as string;
  const router = useRouter();
  const { showToast } = useToast();
  const { loading: userLoading } = useDashboardUser();
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const draggingRef = useRef<{ key: string; hint: PlaceholderHint } | null>(null);

  const [template, setTemplate] = useState<ContractTemplateRow | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [rawContent, setRawContent] = useState("");
  const [placeholders, setPlaceholders] = useState<ContractPlaceholderRow[]>([]);
  const [manualPalette, setManualPalette] = useState<ManualPaletteItem[]>([]);
  const [displayVersion, setDisplayVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [newManualLabel, setNewManualLabel] = useState("");
  const [margins, setMargins] = useState<PageMarginsMm>({ ...DEFAULT_MARGINS_MM });
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef("");

  useEffect(() => {
    if (!templateId) return;
    void (async () => {
      const [templateResult, placeholdersResult] = await Promise.all([
        getContractTemplate(templateId),
        getContractPlaceholders(templateId),
      ]);

      if (!templateResult.ok) {
        showToast(templateResult.error, "error");
        router.push("/dashboard/contracts");
        return;
      }
      if (!placeholdersResult.ok) {
        showToast(placeholdersResult.error, "error");
        router.push("/dashboard/contracts");
        return;
      }

      setTemplate(templateResult.template);
      setTemplateName(templateResult.template.template_name);
      setRawContent(templateResult.template.raw_content);
      const settings = parsePageSettingsFromHtml(
        templateResult.template.raw_content
      );
      setMargins(settings);
      lastSavedContentRef.current = templateResult.template.raw_content;
      setDirty(false);

      // Legacy `{{price}}` / empty-label manuals → always Slovak "Cena" as manual input.
      const normalized = placeholdersResult.placeholders.map((p) => {
        const keyLower = p.placeholder_key.toLowerCase();
        if (keyLower === "price" || keyLower === "cena") {
          return {
            ...p,
            type: "manual_input" as const,
            source_field: null,
            label: p.label?.trim() || "Cena",
          };
        }
        if (
          (p.type === "manual_input" || p.type === "client_input") &&
          !p.label?.trim()
        ) {
          return {
            ...p,
            label: getPlaceholderDisplayLabel(p),
          };
        }
        return p;
      });
      setPlaceholders(normalized);

      // Manual placeholders already mapped in DB show up in the palette for re-use,
      // plus a few suggested fields (e.g. "Cena") that aren't used yet.
      const fromDb = normalized
        .filter((p) => p.type === "manual_input")
        .map((p) => ({
          key: p.placeholder_key,
          label: getPlaceholderDisplayLabel(p),
        }));
      const dbKeys = new Set(fromDb.map((m) => m.key));
      const usedKeys = new Set(normalized.map((p) => p.placeholder_key));
      const suggestions = DEFAULT_MANUAL_SUGGESTIONS.filter(
        (s) =>
          !dbKeys.has(s.key) &&
          !usedKeys.has(s.key) &&
          !usedKeys.has("price") &&
          !(s.key === "cena" && usedKeys.has("price"))
      );
      setManualPalette([...fromDb, ...suggestions]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  function readEditorState(
    hints?: Record<string, PlaceholderHint>,
    marginsOverride?: PageMarginsMm
  ) {
    const el = editorRef.current;
    const cleaned = embedPageSettingsComment(
      normalizeContractHtml(
        el ? stripPlaceholderHighlights(el.innerHTML) : rawContent
      ),
      {
        ...(marginsOverride ?? margins),
        pageNumbers: true,
      }
    );
    const keys = extractPlaceholders(cleaned);
    const byKey = new Map(placeholders.map((p) => [p.placeholder_key, p]));
    const paletteHints = Object.fromEntries(
      manualPalette.map((m) => [
        m.key,
        {
          type: "manual_input" as const,
          source_field: null,
          label: m.label,
        },
      ])
    );
    const merged = keys.map(
      (key) =>
        byKey.get(key) ??
        makeEmptyPlaceholder(templateId, key, hints?.[key] ?? paletteHints[key])
    );
    return { cleaned, merged };
  }

  function applyEditorState(hints?: Record<string, PlaceholderHint>) {
    const { cleaned, merged } = readEditorState(hints);
    setRawContent(cleaned);
    setPlaceholders(merged);
    setDirty(cleaned !== lastSavedContentRef.current);
    setDisplayVersion((v) => v + 1);
    scheduleAutosave(cleaned, merged, templateName);
  }

  function handleEditorBlur() {
    // Sync React state from the live DOM, but do NOT remount the editor —
    // remounting via displayVersion was wiping in-progress formatting.
    const { cleaned, merged } = readEditorState();
    if (cleaned !== rawContent) {
      setRawContent(cleaned);
      setDirty(cleaned !== lastSavedContentRef.current);
      scheduleAutosave(cleaned, merged, templateName);
    }
    setPlaceholders(merged);
  }

  function scheduleAutosave(
    content: string,
    phs: ContractPlaceholderRow[],
    name: string
  ) {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void persistTemplate(content, phs, name, true);
    }, 1200);
  }

  function getEditorRange(): Range | null {
    const el = editorRef.current;
    if (!el) return null;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
      return sel.getRangeAt(0);
    }
    return savedRangeRef.current && el.contains(savedRangeRef.current.startContainer)
      ? savedRangeRef.current
      : null;
  }

  /**
   * Bold / italic / underline. Placeholder chips are `contenteditable=false`, so
   * the browser won't wrap them via execCommand — we wrap them manually, then
   * fall back to execCommand for ordinary selected text.
   * DOM is left as-is (no React re-render) so the selection survives; blur/save
   * read the wrappers back into `{{key}}` HTML.
   */
  /** Notify the editor so undo history / page sync pick up toolbar mutations. */
  function notifyEditorMutated() {
    editorRef.current?.dispatchEvent(
      new Event("input", { bubbles: true })
    );
  }

  function applyInlineFormat(command: "bold" | "italic" | "underline") {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const range = getEditorRange();
    if (!range) {
      document.execCommand(command);
      saveSelection();
      notifyEditorMutated();
      return;
    }

    let chips = findPlaceholderChipsInRange(range, el);
    if (chips.length === 0) {
      const atCaret = findChipAtCaret(range);
      if (atCaret) chips = [atCaret];
    }

    if (chips.length > 0) {
      const tag = wrapTagName(command);
      chips.forEach((chip) => toggleChipWrap(chip, tag));
      saveSelection();
      notifyEditorMutated();
      return;
    }

    document.execCommand(command);
    saveSelection();
    notifyEditorMutated();
  }

  function applyAlignment(command: "justifyLeft" | "justifyCenter" | "justifyRight" | "justifyFull") {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(command);
    saveSelection();
    notifyEditorMutated();
  }

  function applyFontSizePt(pt: number) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const range = getEditorRange();
    if (!range) return;

    let chips = findPlaceholderChipsInRange(range, el);
    if (chips.length === 0) {
      const atCaret = findChipAtCaret(range);
      if (atCaret) chips = [atCaret];
    }

    if (chips.length > 0) {
      chips.forEach((chip) => applyChipFontSize(chip, pt));
      saveSelection();
      notifyEditorMutated();
      return;
    }

    applyFontSizeToSelection(pt);
    saveSelection();
    notifyEditorMutated();
  }

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function insertTokenAtCursor(key: string): boolean {
    const el = editorRef.current;
    if (!el) return false;
    let range = savedRangeRef.current;
    if (!range || !el.contains(range.startContainer)) {
      range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
    }
    insertTextAtRange(range, `{{${key}}}`);
    savedRangeRef.current = range.cloneRange();
    el.focus();
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    return true;
  }

  function handleChipInsert(key: string, hint: PlaceholderHint) {
    if (!insertTokenAtCursor(key)) return;
    applyEditorState({ [key]: hint });
  }

  function handleChipDragStart(key: string, hint: PlaceholderHint) {
    draggingRef.current = { key, hint };
  }

  function handleEditorDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const pending = draggingRef.current;
    draggingRef.current = null;
    const key =
      pending?.key ??
      e.dataTransfer.getData("text/plain").replace(/^\{\{\s*|\s*\}\}$/g, "");
    if (!key) return;

    const el = editorRef.current;
    if (!el) return;
    let range = rangeFromPoint(e.clientX, e.clientY);
    if (!range || !el.contains(range.startContainer)) {
      range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
    }
    insertTextAtRange(range, `{{${key}}}`);
    savedRangeRef.current = range.cloneRange();
    applyEditorState(pending ? { [key]: pending.hint } : undefined);
  }

  /** Adds a manual field to the palette only — does not insert into the document. */
  function handleAddManualField() {
    const label = newManualLabel.trim();
    if (!label) return;
    const existingKeys = [
      ...placeholders.map((p) => p.placeholder_key),
      ...manualPalette.map((m) => m.key),
    ];
    const key = uniquePlaceholderKey(slugifyPlaceholderKey(label), existingKeys);
    setManualPalette((prev) => [...prev, { key, label }]);
    setNewManualLabel("");
  }

  function setPlaceholderType(key: string, type: ContractPlaceholderRow["type"]) {
    setDirty(true);
    setPlaceholders((prev) => {
      const next = prev.map((p) => {
        if (p.placeholder_key !== key) return p;
        if (type === "database_field") {
          return { ...p, type, source_field: p.source_field, label: null };
        }
        const fallbackLabel =
          p.label ||
          (p.source_field ? getAutoFieldLabel(p.source_field) : null) ||
          key;
        return { ...p, type, source_field: null, label: fallbackLabel };
      });
      const { cleaned } = readEditorState();
      scheduleAutosave(cleaned, next, templateName);
      return next;
    });
  }

  function isLabeledPlaceholderType(
    type: ContractPlaceholderRow["type"]
  ): boolean {
    return type === "manual_input" || type === "client_input";
  }

  function setPlaceholderSourceField(key: string, sourceField: string) {
    setDirty(true);
    setPlaceholders((prev) => {
      const next = prev.map((p) =>
        p.placeholder_key === key ? { ...p, source_field: sourceField } : p
      );
      const { cleaned } = readEditorState();
      scheduleAutosave(cleaned, next, templateName);
      return next;
    });
  }

  function setPlaceholderLabel(key: string, label: string) {
    setDirty(true);
    setPlaceholders((prev) => {
      const next = prev.map((p) =>
        p.placeholder_key === key ? { ...p, label } : p
      );
      const { cleaned } = readEditorState();
      scheduleAutosave(cleaned, next, templateName);
      return next;
    });
    setManualPalette((prev) =>
      prev.map((m) => (m.key === key ? { ...m, label } : m))
    );
  }

  async function persistTemplate(
    content: string,
    phs: ContractPlaceholderRow[],
    name: string,
    silent = false
  ) {
    if (!template) return false;
    if (!silent) setSaving(true);

    const result = await saveContractTemplate(template.id, {
      templateName: name,
      rawContent: content,
      placeholders: phs.map((p) => {
        const keyLower = p.placeholder_key.toLowerCase();
        const forcedManual = keyLower === "price" || keyLower === "cena";
        const type = forcedManual ? "manual_input" : p.type;
        return {
          placeholderKey: p.placeholder_key,
          type,
          sourceField: type === "database_field" ? p.source_field : null,
          label:
            type === "manual_input" || type === "client_input"
              ? p.label?.trim() || getPlaceholderDisplayLabel(p)
              : null,
        };
      }),
    });

    if (!silent) setSaving(false);

    if (!result.ok) {
      if (!silent) showToast(result.error, "error");
      return false;
    }

    setTemplate(result.template);
    lastSavedContentRef.current = result.template.raw_content;
    setDirty(false);
    setPlaceholders(result.placeholders);
    // On silent autosave keep the live editor DOM as-is (don't clobber typing).
    // On explicit save, sync React content mirror without forcing a remount.
    if (!silent) {
      setRawContent(result.template.raw_content);
    }
    setManualPalette((prev) => {
      const fromDb = result.placeholders
        .filter((p) => p.type === "manual_input")
        .map((p) => ({
          key: p.placeholder_key,
          label: getPlaceholderDisplayLabel(p),
        }));
      const dbKeys = new Set(fromDb.map((m) => m.key));
      const unused = prev.filter((m) => !dbKeys.has(m.key));
      return [...fromDb, ...unused];
    });
    if (!silent) showToast("Šablóna uložená.", "success");
    return true;
  }

  async function handleSave() {
    if (!template) return;
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const { cleaned, merged } = readEditorState();
    await persistTemplate(cleaned, merged, templateName, false);
  }

  function labelForKey(key: string): string {
    const fromPlaceholder = placeholders.find((p) => p.placeholder_key === key);
    if (fromPlaceholder) return getPlaceholderDisplayLabel(fromPlaceholder);
    const fromPalette = manualPalette.find((m) => m.key === key);
    if (fromPalette?.label?.trim()) return fromPalette.label.trim();
    return getPlaceholderDisplayLabel({ placeholder_key: key, label: null });
  }

  const highlightedHtml = useMemo(
    () =>
      highlightPlaceholders(stripMarginsComment(rawContent), labelForKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawContent, displayVersion, placeholders, manualPalette]
  );

  const usedFieldKeys = useMemo(
    () =>
      new Set(
        placeholders
          .filter((p) => p.type === "database_field" && p.source_field)
          .map((p) => p.source_field as string)
      ),
    [placeholders]
  );

  const usedManualKeys = useMemo(
    () =>
      new Set(
        placeholders
          .filter((p) => p.type === "manual_input")
          .map((p) => p.placeholder_key)
      ),
    [placeholders]
  );

  if (userLoading || loading || !template) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-white/5" />
        <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
          <div className="h-80 rounded-3xl bg-white/[0.03]" />
          <div className="h-80 rounded-3xl bg-white/[0.03]" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-6xl flex-col md:h-[calc(100dvh-5.5rem)]">
      <Reveal>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/dashboard/contracts"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-3.5" />
            Späť na šablóny
          </Link>
          <Link
            href="/dashboard/contracts/tutorial"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-violet-300"
          >
            <CircleHelp className="size-3.5" />
            Ako to funguje?
          </Link>
        </div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-md flex-1 space-y-2">
            <Label htmlFor="template-name" className="text-zinc-400">
              Názov šablóny
            </Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => {
                const next = e.target.value;
                setTemplateName(next);
                setDirty(true);
                const { cleaned, merged } = readEditorState();
                scheduleAutosave(cleaned, merged, next);
              }}
              className="h-11 rounded-xl bg-white/[0.03] text-base"
            />
          </div>
          <div className="flex items-center gap-2 self-start">
            {dirty && (
              <span className="text-xs text-amber-300/90">Neuložené zmeny…</span>
            )}
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="gap-1.5 rounded-full"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Uložiť šablónu
            </Button>
          </div>
        </div>
      </Reveal>

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[1fr_22rem]">
          <div className="flex min-h-0 flex-col">
          <WordDocumentEditor
            editorRef={editorRef}
            html={highlightedHtml}
            remountKey={displayVersion}
            editorClassName={EDITOR_CLASS}
            margins={margins}
            onMarginsChange={(next) => {
              setMargins(next);
              setDirty(true);
              const { cleaned, merged } = readEditorState(undefined, next);
              scheduleAutosave(cleaned, merged, templateName);
            }}
            onBlur={handleEditorBlur}
            onMouseUp={saveSelection}
            onKeyUp={saveSelection}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleEditorDrop}
            onClick={(e) => {
              const chip = (e.target as HTMLElement).closest(
                "[data-ph-token]"
              ) as HTMLElement | null;
              if (chip && editorRef.current?.contains(chip)) {
                const range = document.createRange();
                range.selectNode(chip);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
                savedRangeRef.current = range.cloneRange();
                return;
              }
              saveSelection();
            }}
            toolbar={
              <div className="flex flex-wrap items-center gap-1">
                <ToolbarButton
                  icon={Bold}
                  title="Hrubé písmo (funguje aj na vložené polia)"
                  onClick={() => applyInlineFormat("bold")}
                />
                <ToolbarButton
                  icon={Italic}
                  title="Kurzíva"
                  onClick={() => applyInlineFormat("italic")}
                />
                <ToolbarButton
                  icon={Underline}
                  title="Podčiarknuté"
                  onClick={() => applyInlineFormat("underline")}
                />
                <div className="mx-0.5 h-5 w-px bg-white/10" />
                <select
                  aria-label="Veľkosť písma"
                  defaultValue="11"
                  onMouseDown={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const pt = Number(e.target.value);
                    if (Number.isFinite(pt)) applyFontSizePt(pt);
                  }}
                  className="h-8 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs text-zinc-200 outline-none hover:bg-white/10"
                >
                  {FONT_SIZE_PT.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt} pt
                    </option>
                  ))}
                </select>
                <div className="mx-0.5 h-5 w-px bg-white/10" />
                <ToolbarButton
                  icon={AlignLeft}
                  title="Zarovnať vľavo"
                  onClick={() => applyAlignment("justifyLeft")}
                />
                <ToolbarButton
                  icon={AlignCenter}
                  title="Zarovnať na stred"
                  onClick={() => applyAlignment("justifyCenter")}
                />
                <ToolbarButton
                  icon={AlignRight}
                  title="Zarovnať vpravo"
                  onClick={() => applyAlignment("justifyRight")}
                />
                <ToolbarButton
                  icon={AlignJustify}
                  title="Zarovnať do bloku"
                  onClick={() => applyAlignment("justifyFull")}
                />
              </div>
            }
          />
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          <div className="space-y-3 rounded-2xl border border-white/10 bg-card/70 p-4 backdrop-blur-md">
            <div className="text-sm font-medium text-white">
              Vložiť pole do zmluvy
            </div>
            <p className="text-xs text-zinc-500">
              Ťahaj pole do textu vľavo, alebo klikni a vloží sa na pozíciu
              kurzora.
            </p>

            <div className="space-y-3">
              {CONTRACT_SOURCE_FIELDS.map((group) => (
                <div key={group.group} className="space-y-1.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    {group.group}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.options.map((opt) => {
                      const hint: PlaceholderHint = {
                        type: "database_field",
                        source_field: opt.field,
                        label: null,
                      };
                      const used = usedFieldKeys.has(opt.field);
                      return (
                        <div
                          key={opt.field}
                          draggable
                          onDragStart={() =>
                            handleChipDragStart(opt.field, hint)
                          }
                          onClick={() => handleChipInsert(opt.field, hint)}
                          role="button"
                          tabIndex={0}
                          className={`inline-flex cursor-grab items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors active:cursor-grabbing ${
                            used
                              ? "border-violet-500/30 bg-violet-500/10 text-violet-200"
                              : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-violet-500/30 hover:text-violet-200"
                          }`}
                        >
                          <GripVertical className="size-3 opacity-50" />
                          {opt.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-white/5 pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Manuálne pridané
              </p>
              {manualPalette.length === 0 ? (
                <p className="text-xs text-zinc-600">
                  Zatiaľ žiadne — vytvor nižšie a potom ich ťahaj do zmluvy.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {manualPalette.map((item) => {
                    const hint: PlaceholderHint = {
                      type: "manual_input",
                      source_field: null,
                      label: item.label,
                    };
                    const used = usedManualKeys.has(item.key);
                    return (
                      <div
                        key={item.key}
                        draggable
                        onDragStart={() =>
                          handleChipDragStart(item.key, hint)
                        }
                        onClick={() => handleChipInsert(item.key, hint)}
                        role="button"
                        tabIndex={0}
                        className={`inline-flex cursor-grab items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors active:cursor-grabbing ${
                          used
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                            : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-amber-500/30 hover:text-amber-200"
                        }`}
                      >
                        <GripVertical className="size-3 opacity-50" />
                        {item.label}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Input
                  value={newManualLabel}
                  onChange={(e) => setNewManualLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddManualField();
                    }
                  }}
                  placeholder="Napr. Výška zálohy"
                  className="h-9 rounded-xl bg-white/[0.03] text-sm"
                />
                <Button
                  type="button"
                  size="icon-sm"
                  onClick={handleAddManualField}
                  disabled={!newManualLabel.trim()}
                  className="shrink-0 rounded-xl"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Variable className="size-4 text-violet-300" />
            Premenné v zmluve ({placeholders.length})
          </div>

          {placeholders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-xs text-zinc-500">
              V texte sa nenašla žiadna premenná {"{{...}}"}.
            </div>
          )}

          {placeholders.map((placeholder) => {
            const isAuto = placeholder.type === "database_field";
            const isManual = placeholder.type === "manual_input";
            const isClient = placeholder.type === "client_input";
            return (
              <div
                key={placeholder.id}
                className="space-y-3 rounded-2xl border border-white/10 bg-card/70 p-4 backdrop-blur-md"
              >
                <code className="inline-block rounded bg-white/10 px-2 py-0.5 text-xs text-blue-300">
                  {`{{${placeholder.placeholder_key}}}`}
                </code>

                <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setPlaceholderType(
                          placeholder.placeholder_key,
                          "database_field"
                        )
                      }
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        isAuto
                          ? "bg-violet-500/20 text-violet-200"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <Link2 className="size-3.5" />
                      Automatické
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPlaceholderType(
                          placeholder.placeholder_key,
                          "manual_input"
                        )
                      }
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        isManual
                          ? "bg-violet-500/20 text-violet-200"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <TextCursorInput className="size-3.5" />
                      Manuálne
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPlaceholderType(
                        placeholder.placeholder_key,
                        "client_input"
                      )
                    }
                    className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      isClient
                        ? "bg-fuchsia-500/20 text-fuchsia-200"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <UserRound className="size-3.5" />
                    Vyplní zákazník
                  </button>
                </div>

                {isAuto ? (
                  <Select
                    value={placeholder.source_field ?? ""}
                    onValueChange={(v) =>
                      v &&
                      setPlaceholderSourceField(placeholder.placeholder_key, v)
                    }
                  >
                    <SelectTrigger className="w-full justify-start gap-2 rounded-xl px-3 data-[size=default]:h-10">
                      <SelectValue placeholder="Vyber pole z databázy">
                        {(value: string | null) =>
                          value ? getAutoFieldLabel(value) ?? value : null
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACT_SOURCE_FIELDS.map((group) => (
                        <SelectGroup key={group.group}>
                          <SelectLabel>{group.group}</SelectLabel>
                          {group.options.map((opt) => (
                            <SelectItem
                              key={opt.field}
                              value={opt.field}
                              label={opt.label}
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                ) : isLabeledPlaceholderType(placeholder.type) ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-500">
                      {isClient
                        ? "Názov poľa pre zákazníka"
                        : "Názov poľa pre umelca pri generovaní"}
                    </Label>
                    <Input
                      value={placeholder.label ?? ""}
                      onChange={(e) =>
                        setPlaceholderLabel(
                          placeholder.placeholder_key,
                          e.target.value
                        )
                      }
                      placeholder={
                        isClient
                          ? "Napr. IČO / Adresa / DIČ"
                          : "Napr. Výška zálohy v EUR"
                      }
                      className="h-10 rounded-xl bg-white/[0.03]"
                    />
                    {isClient ? (
                      <p className="text-[11px] leading-relaxed text-zinc-600">
                        Po odoslaní zmluvy zákazník toto pole doplní vo svojom
                        profile. Až potom môže stiahnuť PDF.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
