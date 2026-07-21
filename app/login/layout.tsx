import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Prihlásenie",
  description: `Prihlás sa do ${BRAND.name} — dashboard pre DJ-ov a klientov.`,
  robots: { index: false, follow: true },
  alternates: { canonical: "/login" },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
