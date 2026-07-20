"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Redo2, Undo2 } from "lucide-react";
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  DEFAULT_MARGINS_MM,
  PAGE_GAP_MM,
  clampMarginMm,
  measureMmInPx,
  stripPageSpacers,
  syncPageSpacers,
  type PageMarginsMm,
} from "@/lib/contracts/page-spacers";

const DESK_COLOR = "#555555";
const HISTORY_LIMIT = 60;
const HISTORY_DEBOUNCE_MS = 400;

type WordDocumentEditorProps = {
  editorRef: RefObject<HTMLDivElement | null>;
  html: string;
  remountKey: number;
  editorClassName: string;
  margins: PageMarginsMm;
  onMarginsChange: (margins: PageMarginsMm) => void;
  onBlur: () => void;
  onMouseUp: () => void;
  onKeyUp: () => void;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onInput?: () => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  toolbar?: ReactNode;
};

type DragSide = "top" | "right" | "bottom" | "left";

function readCleanEditorHtml(el: HTMLElement): string {
  return stripPageSpacers(el.innerHTML);
}

/**
 * Word-like multipage editor.
 * White sheets + gray desk gaps are React chrome (always visible).
 * Editor only inserts transparent spacers so text lands inside margin boxes.
 */
export function WordDocumentEditor({
  editorRef,
  html,
  remountKey,
  editorClassName,
  margins,
  onMarginsChange,
  onBlur,
  onMouseUp,
  onKeyUp,
  onClick,
  onInput,
  onDragOver,
  onDrop,
  toolbar,
}: WordDocumentEditorProps) {
  const [pageCount, setPageCount] = useState(1);
  const [previewMargins, setPreviewMargins] = useState<PageMarginsMm>(margins);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const stackRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);
  const restoringHistoryRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const marginInputDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const resizeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{
    side: DragSide;
    startX: number;
    startY: number;
    startMargins: PageMarginsMm;
  } | null>(null);
  const marginsRef = useRef(margins);
  marginsRef.current = margins;

  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const lastSnapshotRef = useRef("");

  const syncHistoryButtons = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  useEffect(() => {
    if (dragRef.current) return;
    setPreviewMargins(margins);
  }, [margins]);

  const previewMarginsRef = useRef(previewMargins);
  previewMarginsRef.current = previewMargins;

  const recomputePages = useCallback(
    (immediate = false, marginsOverride?: PageMarginsMm) => {
      if (dragRef.current) return;

      const run = () => {
        const el = editorRef.current;
        if (!el || syncingRef.current || dragRef.current) return;

        const sel = window.getSelection();
        const hadFocus = document.activeElement === el;
        const range =
          sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)
            ? sel.getRangeAt(0).cloneRange()
            : null;

        const marginsForSync = marginsOverride ?? previewMarginsRef.current;

        syncingRef.current = true;
        try {
          const pages = syncPageSpacers(el, marginsForSync, PAGE_GAP_MM);
          setPageCount(pages);
        } finally {
          requestAnimationFrame(() => {
            syncingRef.current = false;
          });
        }

        if (hadFocus && range) {
          try {
            sel?.removeAllRanges();
            sel?.addRange(range);
          } catch {
            /* ignore */
          }
        }
      };

      if (immediate) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        run();
        return;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(run, 200);
    },
    [editorRef]
  );

  const commitHistorySnapshot = useCallback(() => {
    const el = editorRef.current;
    if (!el || restoringHistoryRef.current) return;
    const current = readCleanEditorHtml(el);
    if (current === lastSnapshotRef.current) return;
    if (lastSnapshotRef.current !== "") {
      undoStackRef.current.push(lastSnapshotRef.current);
      if (undoStackRef.current.length > HISTORY_LIMIT) {
        undoStackRef.current.shift();
      }
    }
    lastSnapshotRef.current = current;
    redoStackRef.current = [];
    syncHistoryButtons();
  }, [editorRef, syncHistoryButtons]);

  const scheduleHistorySnapshot = useCallback(() => {
    if (restoringHistoryRef.current) return;
    if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    historyDebounceRef.current = setTimeout(() => {
      commitHistorySnapshot();
    }, HISTORY_DEBOUNCE_MS);
  }, [commitHistorySnapshot]);

  const restoreHistoryHtml = useCallback(
    (nextHtml: string) => {
      const el = editorRef.current;
      if (!el) return;
      restoringHistoryRef.current = true;
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
      el.innerHTML = nextHtml;
      lastSnapshotRef.current = nextHtml;
      recomputePages(true, marginsRef.current);
      requestAnimationFrame(() => {
        restoringHistoryRef.current = false;
        el.focus();
      });
      syncHistoryButtons();
      onInput?.();
    },
    [editorRef, onInput, recomputePages, syncHistoryButtons]
  );

  const undo = useCallback(() => {
    const el = editorRef.current;
    if (!el || undoStackRef.current.length === 0) return;
    if (historyDebounceRef.current) {
      clearTimeout(historyDebounceRef.current);
      commitHistorySnapshot();
    }
    const current = readCleanEditorHtml(el);
    const prev = undoStackRef.current.pop();
    if (prev === undefined) return;
    redoStackRef.current.push(current);
    restoreHistoryHtml(prev);
  }, [commitHistorySnapshot, editorRef, restoreHistoryHtml]);

  const redo = useCallback(() => {
    const el = editorRef.current;
    if (!el || redoStackRef.current.length === 0) return;
    if (historyDebounceRef.current) {
      clearTimeout(historyDebounceRef.current);
      commitHistorySnapshot();
    }
    const current = readCleanEditorHtml(el);
    const next = redoStackRef.current.pop();
    if (next === undefined) return;
    undoStackRef.current.push(current);
    restoreHistoryHtml(next);
  }, [commitHistorySnapshot, editorRef, restoreHistoryHtml]);

  // Only rewrite the live DOM when the parent explicitly remounts (chip insert,
  // template load). Tracking `html` here would wipe undo history on every blur/autosave.
  const htmlRef = useRef(html);
  htmlRef.current = html;

  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const nextHtml = htmlRef.current;
    el.innerHTML = nextHtml;
    undoStackRef.current = [];
    redoStackRef.current = [];
    lastSnapshotRef.current = stripPageSpacers(nextHtml);
    syncHistoryButtons();
    recomputePages(true, marginsRef.current);
  }, [remountKey, recomputePages, editorRef, syncHistoryButtons]);

  useLayoutEffect(() => {
    if (dragRef.current) return;
    setPreviewMargins(margins);
    recomputePages(true, margins);
  }, [margins, recomputePages]);

  useEffect(() => {
    const stack = stackRef.current;
    if (!stack || typeof ResizeObserver === "undefined") return;

    let lastWidth = stack.clientWidth;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (Math.abs(w - lastWidth) < 1) return;
      lastWidth = w;
      if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current);
      resizeDebounceRef.current = setTimeout(() => {
        recomputePages(true);
      }, 150);
    });
    ro.observe(stack);
    return () => {
      ro.disconnect();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current);
      if (marginInputDebounceRef.current)
        clearTimeout(marginInputDebounceRef.current);
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, [recomputePages, remountKey]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const pxPerMm = measureMmInPx(1);
      const dxMm = (e.clientX - drag.startX) / pxPerMm;
      const dyMm = (e.clientY - drag.startY) / pxPerMm;
      const next = { ...drag.startMargins };

      if (drag.side === "top")
        next.top = clampMarginMm(drag.startMargins.top + dyMm);
      if (drag.side === "bottom")
        next.bottom = clampMarginMm(drag.startMargins.bottom - dyMm);
      if (drag.side === "left")
        next.left = clampMarginMm(drag.startMargins.left + dxMm);
      if (drag.side === "right")
        next.right = clampMarginMm(drag.startMargins.right - dxMm);

      setPreviewMargins(next);
    }
    function onUp() {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      const committed = previewMarginsRef.current;
      onMarginsChange(committed);
      requestAnimationFrame(() => {
        recomputePages(true, committed);
      });
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onMarginsChange, recomputePages]);

  const pageLabel =
    pageCount === 1
      ? "1 strana"
      : pageCount < 5
        ? `${pageCount} strany`
        : `${pageCount} strán`;

  const stackMinHeight = `calc(${pageCount} * ${A4_HEIGHT_MM}mm + ${Math.max(0, pageCount - 1)} * ${PAGE_GAP_MM}mm)`;

  function startDrag(side: DragSide, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      side,
      startX: e.clientX,
      startY: e.clientY,
      startMargins: { ...previewMargins },
    };
  }

  function setMarginField(side: keyof PageMarginsMm, raw: string) {
    const n = Number(raw.replace(",", "."));
    if (!Number.isFinite(n)) return;
    const next = { ...previewMargins, [side]: clampMarginMm(n) };
    setPreviewMargins(next);
    if (marginInputDebounceRef.current)
      clearTimeout(marginInputDebounceRef.current);
    marginInputDebounceRef.current = setTimeout(() => {
      onMarginsChange(next);
      recomputePages(true, next);
    }, 250);
  }

  function resetMargins() {
    const next = { ...DEFAULT_MARGINS_MM };
    setPreviewMargins(next);
    onMarginsChange(next);
    requestAnimationFrame(() => recomputePages(true));
  }

  function handleEditorKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    if (key === "y" || (key === "z" && e.shiftKey)) {
      e.preventDefault();
      redo();
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
      <div className="shrink-0 border-b border-white/10 bg-card/80 p-1.5 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            title="Späť (Ctrl+Z)"
            disabled={!canUndo}
            onMouseDown={(e) => e.preventDefault()}
            onClick={undo}
            className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
          >
            <Undo2 className="size-3.5" />
          </button>
          <button
            type="button"
            title="Vpred (Ctrl+Y)"
            disabled={!canRedo}
            onMouseDown={(e) => e.preventDefault()}
            onClick={redo}
            className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
          >
            <Redo2 className="size-3.5" />
          </button>
          <div className="mx-0.5 h-5 w-px bg-white/10" />
          {toolbar}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-black/30 px-3 py-1.5 text-[11px] text-zinc-300">
        <span className="font-medium text-zinc-400">Okraje (mm)</span>
        {(
          [
            ["top", "Hore"],
            ["bottom", "Dole"],
            ["left", "Vľavo"],
            ["right", "Vpravo"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="inline-flex items-center gap-1">
            <span className="text-zinc-500">{label}</span>
            <input
              type="number"
              min={8}
              max={50}
              step={0.5}
              value={previewMargins[key]}
              onChange={(e) => setMarginField(key, e.target.value)}
              className="h-7 w-14 rounded-md border border-white/10 bg-white/[0.04] px-1.5 text-zinc-200 outline-none focus:border-violet-500/40"
            />
          </label>
        ))}
        <button
          type="button"
          onClick={resetMargins}
          className="ml-auto rounded-md px-2 py-1 text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-200"
        >
          Reset 2,54 cm
        </button>
      </div>

      <div
        className="min-h-0 flex-1 overflow-auto"
        style={{
          background: `radial-gradient(ellipse at top, #7a7a7a 0%, ${DESK_COLOR} 55%, #4a4a4a 100%)`,
        }}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div className="flex justify-center px-3 py-6 sm:px-6 sm:py-8">
          <div
            ref={stackRef}
            className="relative"
            style={{
              width: `min(100%, ${A4_WIDTH_MM}mm)`,
              minHeight: stackMinHeight,
            }}
          >
            {Array.from({ length: pageCount }, (_, i) => (
              <div
                key={`sheet-${i}`}
                aria-hidden
                className="pointer-events-none absolute left-0 right-0 bg-white"
                style={{
                  top: `calc(${i} * (${A4_HEIGHT_MM}mm + ${PAGE_GAP_MM}mm))`,
                  height: `${A4_HEIGHT_MM}mm`,
                  boxShadow:
                    "0 0 0 1px rgba(0,0,0,0.07), 0 6px 20px rgba(0,0,0,0.28)",
                  zIndex: 1,
                }}
              />
            ))}

            <div
              key={remountKey}
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onBlur={() => {
                if (historyDebounceRef.current) {
                  clearTimeout(historyDebounceRef.current);
                  commitHistorySnapshot();
                }
                onBlur();
              }}
              onMouseUp={onMouseUp}
              onKeyDown={handleEditorKeyDown}
              onKeyUp={onKeyUp}
              onClick={onClick}
              onInput={() => {
                scheduleHistorySnapshot();
                recomputePages(false);
                onInput?.();
              }}
              className={editorClassName}
              style={{
                position: "relative",
                zIndex: 10,
                width: "100%",
                minHeight: stackMinHeight,
                fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
                fontSize: "11pt",
                lineHeight: 1.15,
                color: "#000",
                background: "transparent",
                paddingTop: `${previewMargins.top}mm`,
                paddingBottom: `${previewMargins.bottom}mm`,
                paddingLeft: `${previewMargins.left}mm`,
                paddingRight: `${previewMargins.right}mm`,
                boxSizing: "border-box",
                overflowX: "hidden",
                outline: "none",
              }}
            />

            {Array.from({ length: pageCount }, (_, i) => (
              <div
                key={`mask-${i}`}
                aria-hidden
                className="pointer-events-none absolute left-0 right-0"
                style={{
                  top: `calc(${i} * (${A4_HEIGHT_MM}mm + ${PAGE_GAP_MM}mm))`,
                  height: `${A4_HEIGHT_MM}mm`,
                  zIndex: 20,
                }}
              >
                <div
                  className="absolute left-0 bg-white"
                  style={{
                    top: `${previewMargins.top}mm`,
                    bottom: `${previewMargins.bottom}mm`,
                    height: "auto",
                    width: `${previewMargins.left}mm`,
                  }}
                />
                <div
                  className="absolute right-0 bg-white"
                  style={{
                    top: `${previewMargins.top}mm`,
                    bottom: `${previewMargins.bottom}mm`,
                    height: "auto",
                    width: `${previewMargins.right}mm`,
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    top: `${previewMargins.top}mm`,
                    right: `${previewMargins.right}mm`,
                    bottom: `${previewMargins.bottom}mm`,
                    left: `${previewMargins.left}mm`,
                    border: "1px dashed rgba(37, 99, 235, 0.55)",
                  }}
                />
                <div
                  className="absolute text-[10px] tabular-nums text-black/35"
                  style={{
                    right: `${Math.max(2, previewMargins.right * 0.35)}mm`,
                    bottom: `${Math.max(2, previewMargins.bottom * 0.35)}mm`,
                  }}
                >
                  {i + 1} / {pageCount}
                </div>
              </div>
            ))}

            {pageCount > 1 &&
              Array.from({ length: pageCount - 1 }, (_, i) => (
                <div
                  key={`gap-${i}`}
                  aria-hidden
                  className="pointer-events-none absolute left-[-12px] right-[-12px] flex items-center justify-center"
                  style={{
                    top: `calc(${i + 1} * ${A4_HEIGHT_MM}mm + ${i} * ${PAGE_GAP_MM}mm)`,
                    height: `${PAGE_GAP_MM}mm`,
                    zIndex: 30,
                    background: DESK_COLOR,
                    boxShadow:
                      "inset 0 8px 10px -8px rgba(0,0,0,0.35), inset 0 -8px 10px -8px rgba(0,0,0,0.35)",
                  }}
                >
                  <span
                    className="rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide text-white/90"
                    style={{ background: "rgba(0,0,0,0.42)" }}
                  >
                    Strana {i + 2}
                  </span>
                </div>
              ))}

            <div
              aria-hidden
              className="pointer-events-none absolute left-0 right-0"
              style={{ top: 0, height: `${A4_HEIGHT_MM}mm`, zIndex: 40 }}
            >
              <div
                title="Ťahaj pre horný okraj"
                onMouseDown={(e) => startDrag("top", e)}
                className="absolute left-0 right-0 cursor-ns-resize"
                style={{
                  top: `calc(${previewMargins.top}mm - 4px)`,
                  height: 8,
                  pointerEvents: "auto",
                }}
              />
              <div
                title="Ťahaj pre dolný okraj"
                onMouseDown={(e) => startDrag("bottom", e)}
                className="absolute left-0 right-0 cursor-ns-resize"
                style={{
                  bottom: `calc(${previewMargins.bottom}mm - 4px)`,
                  height: 8,
                  pointerEvents: "auto",
                }}
              />
              <div
                title="Ťahaj pre ľavý okraj"
                onMouseDown={(e) => startDrag("left", e)}
                className="absolute top-0 bottom-0 cursor-ew-resize"
                style={{
                  left: `calc(${previewMargins.left}mm - 4px)`,
                  width: 8,
                  pointerEvents: "auto",
                }}
              />
              <div
                title="Ťahaj pre pravý okraj"
                onMouseDown={(e) => startDrag("right", e)}
                className="absolute top-0 bottom-0 cursor-ew-resize"
                style={{
                  right: `calc(${previewMargins.right}mm - 4px)`,
                  width: 8,
                  pointerEvents: "auto",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-black/25 bg-[#3f3f3f] px-4 py-1.5 text-[11px] text-white/70">
        <span>{pageLabel} · A4 · text ostáva v okrajoch</span>
        <span>
          H {previewMargins.top} · D {previewMargins.bottom} · Ľ{" "}
          {previewMargins.left} · P {previewMargins.right} mm
        </span>
      </div>
    </div>
  );
}
