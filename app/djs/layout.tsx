import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata("catalog");

export default function DjsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
