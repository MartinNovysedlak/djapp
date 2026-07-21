import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND } from "@/lib/brand";

const FOOTER_LINKS = [
  { href: "/djs", label: "Katalóg" },
  { href: "/kontakt", label: "Kontakt" },
  { href: "/podmienky", label: "Podmienky používania" },
  { href: "/obchodne-podmienky", label: "Obchodné podmienky" },
] as const;

export function SiteFooter({
  caption,
}: {
  caption?: string;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-white/5 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-start">
          <div className="flex flex-col items-center gap-3 md:items-start">
            <Link href="/" className="inline-flex">
              <BrandLogo size="md" />
            </Link>
            <p className="max-w-xs text-center text-xs leading-relaxed text-zinc-500 md:text-left">
              {BRAND.shortDescription}
            </p>
          </div>

          <nav
            aria-label="Pätička"
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-500"
          >
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-zinc-300"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col items-center justify-between gap-2 border-t border-white/5 pt-6 text-center text-[11px] text-zinc-600 md:flex-row md:text-left">
          <span>
            &copy; {year} {BRAND.name}. Všetky práva vyhradené.
            {caption ? ` — ${caption}` : ""}
          </span>
          <a
            href={`mailto:${BRAND.email}`}
            className="transition-colors hover:text-zinc-400"
          >
            {BRAND.email}
          </a>
        </div>
      </div>
    </footer>
  );
}
