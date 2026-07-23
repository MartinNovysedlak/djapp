import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd()),
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