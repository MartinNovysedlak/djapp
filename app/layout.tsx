import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ToastProvider } from "@/lib/toast-context";
import { BRAND, SEO_DEFAULT } from "@/lib/brand";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || BRAND.url;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SEO_DEFAULT.title,
    template: SEO_DEFAULT.titleTemplate,
  },
  description: SEO_DEFAULT.description,
  keywords: [...SEO_DEFAULT.keywords],
  applicationName: BRAND.name,
  authors: [{ name: BRAND.name }],
  creator: BRAND.name,
  publisher: BRAND.name,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: BRAND.locale,
    url: siteUrl,
    siteName: BRAND.name,
    title: SEO_DEFAULT.title,
    description: SEO_DEFAULT.description,
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_DEFAULT.title,
    description: SEO_DEFAULT.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk" className="dark">
      <body className={`${outfit.variable} font-sans antialiased`}>
        <ToastProvider>
          <Navbar />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
