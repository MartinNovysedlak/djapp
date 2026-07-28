import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd()),
  /**
   * Next 15 sets dynamic staleTime to 0 — every soft navigation refetches RSC
   * from the server (often 1–2s on Vercel). Cache page segments on the client
   * so dashboard / marketing clicks feel instant after the first prefetch.
   */
  experimental: {
    staleTimes: {
      dynamic: 120,
      static: 300,
    },
  },
  serverExternalPackages: [
    "mammoth",
    "puppeteer-core",
    "@sparticuz/chromium",
    "node-html-parser",
    "@react-pdf/renderer",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zqaslhehioqdfjuvhoxw.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
