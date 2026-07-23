import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata("register");

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
