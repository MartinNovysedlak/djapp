import fs from "fs";
import { wrapContractDocumentHtml } from "./document-css";
import {
  parsePageSettingsFromHtml,
  type PageMarginsMm,
  type PageSettings,
  DEFAULT_PAGE_SETTINGS,
} from "./page-spacers";

function guessLocalChromePath(): string | undefined {
  if (process.platform === "win32") {
    const candidates = [
      process.env.LOCALAPPDATA &&
        `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
      process.env.PROGRAMFILES &&
        `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
      process.env["PROGRAMFILES(X86)"] &&
        `${process.env["PROGRAMFILES(X86)"]}\\Google\\Chrome\\Application\\chrome.exe`,
      process.env.PROGRAMFILES &&
        `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
      process.env["PROGRAMFILES(X86)"] &&
        `${process.env["PROGRAMFILES(X86)"]}\\Microsoft\\Edge\\Application\\msedge.exe`,
    ].filter(Boolean) as string[];

    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  }

  if (process.platform === "darwin") {
    for (const p of [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ]) {
      if (fs.existsSync(p)) return p;
    }
  }

  return undefined;
}

async function launchBrowser() {
  const puppeteer = await import("puppeteer-core");
  const isServerless = !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NETLIFY
  );

  if (isServerless) {
    const chromium = await import("@sparticuz/chromium");
    return puppeteer.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
      defaultViewport: { width: 1280, height: 720 },
    });
  }

  const localPath =
    process.env.CHROME_PATH ||
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    guessLocalChromePath();

  if (localPath) {
    return puppeteer.default.launch({
      executablePath: localPath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: { width: 1280, height: 720 },
    });
  }

  return puppeteer.default.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1280, height: 720 },
  });
}

/** Footer template matching the editor's on-screen page-number preview (bottom-right, muted). */
function buildFooterTemplate(margins: PageMarginsMm): string {
  const rightPad = Math.max(2, margins.right * 0.35);
  const bottomPad = Math.max(2, margins.bottom * 0.35);
  return `
    <div style="width:100%;box-sizing:border-box;padding:0 ${rightPad}mm 0 ${margins.left}mm;">
      <div style="
        font-family: Calibri, 'Segoe UI', Arial, sans-serif;
        font-size: 8pt;
        color: rgba(0,0,0,0.45);
        text-align: right;
        margin-bottom: ${bottomPad}mm;
      "><span class="pageNumber"></span> / <span class="totalPages"></span></div>
    </div>
  `;
}

/**
 * Renders the resolved contract HTML to PDF via headless Chromium.
 * Margins are passed through Puppeteer's own `margin` option (not CSS
 * `@page`), which is the only option Chromium's print engine reliably
 * honors — that's what keeps the PDF's printable area matching the editor.
 */
export async function renderHtmlToPdfBuffer(
  bodyHtml: string,
  title = "Zmluva",
  settings: PageSettings = DEFAULT_PAGE_SETTINGS
): Promise<Buffer> {
  const html = wrapContractDocumentHtml(bodyHtml, title);
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: `${settings.top}mm`,
        right: `${settings.right}mm`,
        bottom: `${settings.bottom}mm`,
        left: `${settings.left}mm`,
      },
      displayHeaderFooter: settings.pageNumbers,
      headerTemplate: "<span></span>",
      footerTemplate: settings.pageNumbers
        ? buildFooterTemplate(settings)
        : "<span></span>",
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/** Convenience: read margins + page-number preference from raw template HTML comment, then render. */
export async function renderTemplateHtmlToPdfBuffer(
  rawOrResolvedHtml: string,
  title = "Zmluva"
): Promise<Buffer> {
  const settings = parsePageSettingsFromHtml(rawOrResolvedHtml);
  return renderHtmlToPdfBuffer(rawOrResolvedHtml, title, settings);
}
