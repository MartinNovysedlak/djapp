import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Kontaktuj tím BookTheVibe — otázky k rezerváciám, DJ profilu alebo spolupráci. Odpovieme ti čo najskôr.",
  alternates: { canonical: "/kontakt" },
  openGraph: {
    title: `Kontakt | ${BRAND.name}`,
    description:
      "Ozvi sa BookTheVibe. Pomôžeme DJ-om aj klientom s rezerváciami a eventami.",
    url: "/kontakt",
    siteName: BRAND.name,
    locale: BRAND.locale,
    type: "website",
  },
};

export default function KontaktLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
