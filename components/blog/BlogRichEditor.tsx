"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Pilcrow,
  Underline,
  ALargeSmall,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BlogRichEditorProps = {
  value: string;
  onChange: (html: string) => void;
  className?: string;
};

function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

export function BlogRichEditor({ value, onChange, className }: BlogRichEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const seeded = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const next = value || "<p></p>";
    if (!seeded.current) {
      ref.current.innerHTML = next;
      seeded.current = true;
      return;
    }
    if (
      document.activeElement !== ref.current &&
      ref.current.innerHTML !== next
    ) {
      ref.current.innerHTML = next;
    }
  }, [value]);

  function emit() {
    if (!ref.current) return;
    onChange(ref.current.innerHTML);
  }

  function run(cmd: string, arg?: string) {
    ref.current?.focus();
    exec(cmd, arg);
    emit();
  }

  function setBlock(tag: "p" | "h2" | "h3") {
    ref.current?.focus();
    exec("formatBlock", tag);
    emit();
  }

  function setFontSize(sizePx: number) {
    ref.current?.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }
    const range = selection.getRangeAt(0);
    const span = document.createElement("span");
    span.style.fontSize = `${sizePx}px`;
    try {
      range.surroundContents(span);
    } catch {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
    }
    selection.removeAllRanges();
    const after = document.createRange();
    after.selectNodeContents(span);
    after.collapse(false);
    selection.addRange(after);
    emit();
  }

  function addLink() {
    const url = window.prompt("URL odkazu");
    if (!url) return;
    run("createLink", url.startsWith("http") ? url : `https://${url}`);
  }

  async function insertImage(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-blog-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload zlyhal");
      ref.current?.focus();
      exec(
        "insertHTML",
        `<figure class="blog-figure"><img src="${data.url}" alt="" /><figcaption></figcaption></figure><p></p>`
      );
      emit();
    } catch (err) {
      console.error(err);
      window.alert(err instanceof Error ? err.message : "Upload zlyhal");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-white/10", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-white/[0.03] p-2">
        <ToolBtn title="Odsek" onClick={() => setBlock("p")}>
          <Pilcrow className="size-4" />
        </ToolBtn>
        <ToolBtn title="Nadpis H2" onClick={() => setBlock("h2")}>
          <Heading2 className="size-4" />
        </ToolBtn>
        <ToolBtn title="Nadpis H3" onClick={() => setBlock("h3")}>
          <Heading3 className="size-4" />
        </ToolBtn>
        <span className="mx-1 h-5 w-px bg-white/10" />
        <ToolBtn title="Tučné" onClick={() => run("bold")}>
          <Bold className="size-4" />
        </ToolBtn>
        <ToolBtn title="Kurzíva" onClick={() => run("italic")}>
          <Italic className="size-4" />
        </ToolBtn>
        <ToolBtn title="Podčiarknuté" onClick={() => run("underline")}>
          <Underline className="size-4" />
        </ToolBtn>
        <span className="mx-1 h-5 w-px bg-white/10" />
        <ToolBtn title="Menší text" onClick={() => setFontSize(14)}>
          <span className="text-[10px] font-semibold">A</span>
        </ToolBtn>
        <ToolBtn title="Bežný text" onClick={() => setFontSize(16)}>
          <ALargeSmall className="size-4" />
        </ToolBtn>
        <ToolBtn title="Väčší text" onClick={() => setFontSize(20)}>
          <span className="text-sm font-semibold">A</span>
        </ToolBtn>
        <span className="mx-1 h-5 w-px bg-white/10" />
        <ToolBtn title="Odrážky" onClick={() => run("insertUnorderedList")}>
          <List className="size-4" />
        </ToolBtn>
        <ToolBtn title="Číslovaný zoznam" onClick={() => run("insertOrderedList")}>
          <ListOrdered className="size-4" />
        </ToolBtn>
        <ToolBtn title="Odkaz" onClick={addLink}>
          <Link2 className="size-4" />
        </ToolBtn>
        <ToolBtn
          title="Nahrať fotku do textu"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImageIcon className="size-4" />
          )}
        </ToolBtn>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void insertImage(file);
          }}
        />
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        className="blog-editor prose-invert min-h-[320px] max-w-none px-4 py-3 text-sm leading-relaxed text-zinc-200 outline-none [&_a]:text-violet-300 [&_a]:underline [&_figcaption]:mt-1 [&_figcaption]:text-xs [&_figcaption]:text-zinc-500 [&_figure]:my-4 [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-white [&_img]:max-h-[420px] [&_img]:w-full [&_img]:rounded-xl [&_img]:object-cover [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}

function ToolBtn({
  children,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="text-zinc-300 hover:bg-white/10 hover:text-white"
    >
      {children}
    </Button>
  );
}
