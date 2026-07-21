import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ToastProvider } from "@/lib/toast-context";
import { ClearServiceWorkers } from "@/components/ClearServiceWorkers";
import { BRAND, SEO_DEFAULT } from "@/lib/brand";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || BRAND.url;

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  colorScheme: "dark",
};

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
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
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
          <ClearServiceWorkers />
          <Navbar />
          {children}
        </ToastProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
