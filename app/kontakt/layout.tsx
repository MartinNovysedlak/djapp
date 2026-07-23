import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata("kontakt");

export default function KontaktLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
