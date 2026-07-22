"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onBlurCommit?: (value: string) => void;
  multiline?: boolean;
  className?: string;
  style?: CSSProperties;
  placeholder?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  enabled?: boolean;
};

/**
 * Click-to-edit text for the page builder canvas.
 * Uncontrolled while focused — commits on blur.
 */
export function InlineEditable({
  value,
  onChange,
  onBlurCommit,
  multiline = false,
  className,
  style,
  placeholder = "Klikni a uprav…",
  as: Tag = "p",
  enabled = true,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const focused = useRef(false);

  useEffect(() => {
    if (!enabled || !ref.current || focused.current) return;
    if (ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
  }, [value, enabled]);

  if (!enabled) {
    return (
      <Tag className={className} style={style}>
        {value || null}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref as never}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline={multiline}
      tabIndex={0}
      data-placeholder={placeholder}
      style={style}
      onClick={(e) => e.stopPropagation()}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        const next = (ref.current?.textContent ?? "").replace(/\u00a0/g, " ");
        onChange(next);
        onBlurCommit?.(next);
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          ref.current?.blur();
        }
      }}
      className={cn(
        "rounded-md outline-none ring-offset-2 focus:ring-2 focus:ring-violet-400/50 empty:before:pointer-events-none empty:before:text-zinc-600 empty:before:content-[attr(data-placeholder)]",
        className
      )}
    />
  );
}
