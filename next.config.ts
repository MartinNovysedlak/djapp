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
    ],
  },
};

export default nextConfig;