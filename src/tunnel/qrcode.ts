/**
 * QR code display utilities
 */

import qrcode from "qrcode";
import qrcodeTerminal from "qrcode-terminal";

/**
 * Display QR code in terminal with validation
 */
export async function displayQRCode(url: string): Promise<void> {
  if (typeof url !== "string" || !url || url === "undefined" || !url.startsWith("http")) {
    console.error("[QR] Invalid URL, skipping QR (already displayed or stale call)");
    return;
  }

  console.log("\n" + "=".repeat(50));
  console.log("  OpenCode Mobile Connection Ready!");
  console.log("=".repeat(50));
  console.log(`\n  ${url}\n`);
  console.log("Scan to connect mobile device:\n");

  try {
    qrcodeTerminal.generate(url, { small: false }, (qrcode: string) => {
      console.log(qrcode);
      console.log("=".repeat(50) + "\n");
    });
  } catch {
    console.log("  Install qrcode-terminal for QR code display");
    console.log("  npm install -g qrcode-terminal\n");
    console.log("=".repeat(50) + "\n");
  }
}

/**
 * Display QR code and optionally save to file
 */
export async function displayQRCodeAndSave(
  url: string,
  filepath?: string
): Promise<string> {
  await displayQRCode(url);

  if (filepath) {
    try {
      await qrcode.toFile(filepath, url, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
      console.log(`[QR] Saved QR code to: ${filepath}`);
      return filepath;
    } catch (error: any) {
      console.error("[QR] Failed to save QR code:", error.message);
    }
  }

  return url;
}

/**
 * Generate QR code as data URL
 */
export async function generateQRCodeDataUrl(url: string): Promise<string> {
  return qrcode.toDataURL(url);
}
