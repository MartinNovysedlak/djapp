import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Registrácia",
  description: `Vytvor účet na ${BRAND.name}. Profil umelca do katalógu alebo klientsky účet na rezervácie.`,
  alternates: { canonical: "/register" },
  openGraph: {
    title: `Registrácia | ${BRAND.name}`,
    description:
      "Založ si free účet — ako umelec do katalógu, alebo ako klient na rezerváciu.",
    url: "/register",
    siteName: BRAND.name,
    locale: BRAND.locale,
    type: "website",
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
