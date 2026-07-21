import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Katalóg DJ-ov",
  description:
    "Prehliadaj DJ-ov na BookTheVibe podľa mesta a hodnotenia. Pozri profil, dostupnosť a pošli nezáväzný dopyt na svoju akciu.",
  alternates: { canonical: "/djs" },
  openGraph: {
    title: `Katalóg DJ-ov | ${BRAND.name}`,
    description:
      "Nájdi DJ-a pre svadbu, oslavu alebo event. Katalóg s profilmi, recenziami a rezerváciou online.",
    url: "/djs",
    siteName: BRAND.name,
    locale: BRAND.locale,
    type: "website",
  },
};

export default function DjsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
