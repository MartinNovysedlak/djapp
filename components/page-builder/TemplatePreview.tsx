import { cn } from "@/lib/utils";

/** Mini CSS mock of a section template for the insert picker. */
export function TemplatePreview({
  templateId,
  className,
}: {
  templateId: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative h-24 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-2",
        className
      )}
      aria-hidden
    >
      <PreviewInner id={templateId} />
    </div>
  );
}

function Bar({ className }: { className?: string }) {
  return <div className={cn("rounded-sm bg-white/20", className)} />;
}

function Photo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-md bg-gradient-to-br from-violet-500/40 via-fuchsia-500/20 to-zinc-800",
        className
      )}
    />
  );
}

function PreviewInner({ id }: { id: string }) {
  switch (id) {
    case "hero.cover":
      return (
        <div className="flex h-full flex-col gap-1.5">
          <Photo className="h-10 w-full" />
          <div className="flex items-end gap-2 px-0.5">
            <div className="h-6 w-6 shrink-0 rounded-full bg-violet-400/50" />
            <div className="min-w-0 flex-1 space-y-1">
              <Bar className="h-2 w-2/3" />
              <Bar className="h-1.5 w-1/2 bg-white/10" />
            </div>
            <Bar className="h-4 w-10 rounded-md bg-violet-400/50" />
          </div>
        </div>
      );
    case "hero.minimal":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-1.5">
          <Bar className="h-2.5 w-1/2" />
          <Bar className="h-1.5 w-1/3 bg-white/10" />
          <Bar className="mt-1 h-4 w-14 rounded-md bg-violet-400/50" />
        </div>
      );
    case "hero.centered":
      return (
        <div className="relative flex h-full flex-col items-center justify-end gap-1 pb-1">
          <Photo className="absolute inset-0 rounded-lg opacity-70" />
          <Bar className="relative z-[1] h-2 w-1/2" />
          <Bar className="relative z-[1] h-4 w-12 rounded-md bg-white/30" />
        </div>
      );
    case "about.simple":
    case "text.plain":
      return (
        <div className="flex h-full flex-col justify-center gap-1.5 px-1">
          <Bar className="h-2 w-1/3" />
          <Bar className="h-1.5 w-full bg-white/10" />
          <Bar className="h-1.5 w-5/6 bg-white/10" />
          <Bar className="h-1.5 w-2/3 bg-white/10" />
        </div>
      );
    case "about.split":
    case "text.feature":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-1.5">
          <Bar className="h-2.5 w-2/5" />
          <Bar className="h-1.5 w-3/5 bg-white/10" />
          <Bar className="h-1.5 w-1/2 bg-white/10" />
        </div>
      );
    case "about.quote":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-1 px-2">
          <span className="text-lg leading-none text-violet-300/60">„</span>
          <Bar className="h-1.5 w-4/5 bg-white/15" />
          <Bar className="h-1.5 w-3/5 bg-white/10" />
        </div>
      );
    case "text.photoLeft":
      return (
        <div className="flex h-full gap-2">
          <Photo className="h-full w-[38%]" />
          <div className="flex flex-1 flex-col justify-center gap-1.5">
            <Bar className="h-2 w-2/3" />
            <Bar className="h-1.5 w-full bg-white/10" />
            <Bar className="h-1.5 w-4/5 bg-white/10" />
          </div>
        </div>
      );
    case "text.photoRight":
      return (
        <div className="flex h-full gap-2">
          <div className="flex flex-1 flex-col justify-center gap-1.5">
            <Bar className="h-2 w-2/3" />
            <Bar className="h-1.5 w-full bg-white/10" />
            <Bar className="h-1.5 w-4/5 bg-white/10" />
          </div>
          <Photo className="h-full w-[38%]" />
        </div>
      );
    case "text.banner":
      return (
        <div className="flex h-full flex-col gap-1.5">
          <Photo className="h-12 w-full" />
          <Bar className="h-2 w-1/3" />
          <Bar className="h-1.5 w-2/3 bg-white/10" />
        </div>
      );
    case "text.overlay":
      return (
        <div className="relative flex h-full items-end p-1.5">
          <Photo className="absolute inset-0 rounded-lg" />
          <div className="relative z-[1] w-full space-y-1 rounded-md bg-black/50 p-1.5 backdrop-blur-sm">
            <Bar className="h-2 w-1/2" />
            <Bar className="h-1.5 w-3/4 bg-white/20" />
          </div>
        </div>
      );
    case "gallery.grid3":
    case "gallery.grid":
      return (
        <div className="grid h-full grid-cols-3 gap-1">
          <Photo className="h-full" />
          <Photo className="h-full from-rose-500/30" />
          <Photo className="h-full from-sky-500/30" />
        </div>
      );
    case "gallery.grid2":
      return (
        <div className="grid h-full grid-cols-2 gap-1.5">
          <Photo className="h-full" />
          <Photo className="h-full from-amber-500/30" />
        </div>
      );
    case "gallery.slideshow":
      return (
        <div className="relative flex h-full flex-col gap-1">
          <Photo className="min-h-0 flex-1 w-full" />
          <div className="flex justify-center gap-1">
            <div className="h-1 w-4 rounded-full bg-white/70" />
            <div className="h-1 w-1 rounded-full bg-white/25" />
            <div className="h-1 w-1 rounded-full bg-white/25" />
          </div>
        </div>
      );
    case "gallery.marquee":
      return (
        <div className="flex h-full items-center gap-1.5 overflow-hidden">
          <Photo className="h-14 w-20 shrink-0" />
          <Photo className="h-14 w-20 shrink-0 from-rose-500/35" />
          <Photo className="h-14 w-20 shrink-0 from-sky-500/35" />
          <Photo className="h-14 w-12 shrink-0 opacity-40" />
        </div>
      );
    case "gallery.bento":
      return (
        <div className="grid h-full grid-cols-4 grid-rows-2 gap-1">
          <Photo className="col-span-2 row-span-2 h-full" />
          <Photo className="h-full from-rose-500/30" />
          <Photo className="h-full from-sky-500/30" />
          <Photo className="h-full from-amber-500/30" />
          <Photo className="h-full from-emerald-500/30" />
        </div>
      );
    case "calendar.month":
      return (
        <div className="grid h-full grid-cols-7 gap-0.5 p-0.5">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "rounded-[2px] bg-white/10",
                i === 8 && "bg-violet-400/50"
              )}
            />
          ))}
        </div>
      );
    case "calendar.weeks":
      return (
        <div className="flex h-full flex-col gap-1 p-0.5">
          <div className="flex items-center justify-between px-0.5">
            <Bar className="h-2 w-3 bg-white/20" />
            <Bar className="h-1.5 w-10 bg-white/15" />
            <Bar className="h-2 w-3 bg-white/20" />
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-7 gap-0.5">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-[2px]",
                  i === 3 || i === 9
                    ? "bg-rose-400/40"
                    : "bg-emerald-400/25"
                )}
              />
            ))}
          </div>
        </div>
      );
    case "calendar.compact":
    case "calendar.card":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03]">
          <Bar className="h-2 w-1/3" />
          <div className="flex gap-1">
            <Bar className="h-5 w-5 rounded-md bg-violet-400/40" />
            <Bar className="h-5 w-5 rounded-md bg-white/10" />
            <Bar className="h-5 w-5 rounded-md bg-white/10" />
          </div>
        </div>
      );
    case "media.stack":
      return (
        <div className="flex h-full flex-col gap-1">
          <Photo className="min-h-0 flex-1 from-zinc-700" />
          <Photo className="h-6 from-zinc-800 opacity-70" />
        </div>
      );
    case "media.featured":
      return (
        <div className="relative flex h-full items-center justify-center">
          <Photo className="absolute inset-0" />
          <div className="relative z-[1] flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-[10px] text-white">
            ▶
          </div>
        </div>
      );
    case "media.filmstrip":
      return (
        <div className="flex h-full items-center gap-1.5 overflow-hidden">
          <Photo className="h-14 w-20 shrink-0 from-zinc-700" />
          <Photo className="h-14 w-20 shrink-0 from-zinc-600" />
          <Photo className="h-14 w-16 shrink-0 from-zinc-800 opacity-50" />
        </div>
      );
    case "packages.cards":
    case "packages.list":
    case "packages.highlight":
      return (
        <div className="grid h-full grid-cols-2 gap-1.5">
          <div className="space-y-1 rounded-md border border-white/10 bg-white/[0.04] p-1.5">
            <Bar className="h-1.5 w-2/3" />
            <Bar className="h-4 w-1/2 bg-violet-400/40" />
          </div>
          <div className="space-y-1 rounded-md border border-white/10 bg-white/[0.04] p-1.5">
            <Bar className="h-1.5 w-2/3" />
            <Bar className="h-4 w-1/2 bg-white/15" />
          </div>
        </div>
      );
    case "reviews.list":
    case "reviews.cards":
    case "reviews.grid":
      return (
        <div className="flex h-full flex-col gap-1.5 justify-center">
          <div className="space-y-1 rounded-md border border-white/10 bg-white/[0.04] p-1.5">
            <Bar className="h-1.5 w-1/4 bg-amber-300/50" />
            <Bar className="h-1.5 w-full bg-white/10" />
          </div>
          <div className="space-y-1 rounded-md border border-white/10 bg-white/[0.04] p-1.5">
            <Bar className="h-1.5 w-1/4 bg-amber-300/50" />
            <Bar className="h-1.5 w-4/5 bg-white/10" />
          </div>
        </div>
      );
    case "reviews.spotlight":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-1.5 px-2">
          <Bar className="h-1.5 w-1/4 bg-amber-300/50" />
          <Bar className="h-1.5 w-4/5 bg-white/15" />
          <Bar className="h-1.5 w-3/5 bg-white/10" />
        </div>
      );
    case "reviews.strip":
      return (
        <div className="flex h-full items-center gap-1.5 overflow-hidden">
          <div className="h-14 w-24 shrink-0 space-y-1 rounded-md border border-white/10 bg-white/[0.04] p-1.5">
            <Bar className="h-1 w-1/3 bg-amber-300/50" />
            <Bar className="h-1 w-full bg-white/10" />
          </div>
          <div className="h-14 w-24 shrink-0 space-y-1 rounded-md border border-white/10 bg-white/[0.04] p-1.5">
            <Bar className="h-1 w-1/3 bg-amber-300/50" />
            <Bar className="h-1 w-full bg-white/10" />
          </div>
        </div>
      );
    case "faq.accordion":
    case "faq.stack":
      return (
        <div className="flex h-full flex-col justify-center gap-1">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-1"
            >
              <Bar className="h-1.5 w-2/3 bg-white/20" />
              <span className="text-[8px] text-zinc-500">▾</span>
            </div>
          ))}
        </div>
      );
    case "faq.columns":
      return (
        <div className="grid h-full grid-cols-2 gap-1.5">
          <div className="space-y-1 rounded-md border border-white/10 bg-white/[0.04] p-1.5">
            <Bar className="h-1.5 w-2/3" />
            <Bar className="h-1 w-full bg-white/10" />
          </div>
          <div className="space-y-1 rounded-md border border-white/10 bg-white/[0.04] p-1.5">
            <Bar className="h-1.5 w-2/3" />
            <Bar className="h-1 w-full bg-white/10" />
          </div>
        </div>
      );
    case "contact.simple":
    case "contact.cards":
      return (
        <div className="flex h-full flex-col justify-center gap-1.5 px-1">
          <Bar className="h-2 w-1/4" />
          <div className="flex gap-1.5">
            <Bar className="h-6 flex-1 rounded-md bg-white/10" />
            <Bar className="h-6 flex-1 rounded-md bg-white/10" />
          </div>
        </div>
      );
    case "contact.pill":
      return (
        <div className="flex h-full items-center justify-center gap-1.5">
          <Bar className="h-5 w-14 rounded-full bg-white/15" />
          <Bar className="h-5 w-12 rounded-full bg-violet-400/30" />
          <Bar className="h-5 w-12 rounded-full bg-white/15" />
        </div>
      );
    case "cta.banner":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-1.5 rounded-lg bg-violet-500/20">
          <Bar className="h-2 w-2/5" />
          <Bar className="h-5 w-16 rounded-md bg-violet-400/60" />
        </div>
      );
    case "cta.split":
      return (
        <div className="flex h-full items-center gap-2">
          <div className="flex-1 space-y-1">
            <Bar className="h-2 w-3/4" />
            <Bar className="h-1.5 w-1/2 bg-white/10" />
          </div>
          <Bar className="h-6 w-14 shrink-0 rounded-md bg-violet-400/50" />
        </div>
      );
    case "cta.minimal":
      return (
        <div className="flex h-full items-center justify-center">
          <Bar className="h-6 w-20 rounded-md bg-violet-400/55" />
        </div>
      );
    default:
      return (
        <div className="flex h-full flex-col justify-center gap-1.5 px-2">
          <Bar className="h-2 w-1/3" />
          <Bar className="h-1.5 w-full bg-white/10" />
          <Bar className="h-1.5 w-2/3 bg-white/10" />
        </div>
      );
  }
}

export function TypePreview({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const map: Record<string, string> = {
    about: "about.simple",
    text: "text.photoLeft",
    gallery: "gallery.bento",
    calendar: "calendar.weeks",
    media: "media.filmstrip",
    packages: "packages.cards",
    reviews: "reviews.spotlight",
    faq: "faq.columns",
    contact: "contact.pill",
    cta: "cta.minimal",
    hero: "hero.cover",
  };
  return (
    <TemplatePreview
      templateId={map[type] ?? "text.plain"}
      className={className}
    />
  );
}
