/**
 * CLI utility to render tunnel QR code from a JSON file
 */

import * as fs from 'fs';
import * as path from 'path';

import { generateQRCodeAscii } from '../tunnel/qrcode.js';

type QrCliArgs = {
  filePath?: string;
  help?: boolean;
};

const URL_KEYS = [
  'url',
  'tunnelUrl',
  'tunnel_url',
  'publicUrl',
  'public_url',
  'tunnel',
  'public',
];

function parseArgs(args: string[]): QrCliArgs {
  const result: QrCliArgs = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
      continue;
    }

    if (arg === '--file' || arg === '-f') {
      if (i + 1 < args.length) {
        i += 1;
        result.filePath = args[i];
      }
      continue;
    }

    if (arg.startsWith('-')) {
      continue;
    }

    if (!result.filePath) {
      result.filePath = arg;
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
OpenCode Mobile - Tunnel QR Utility

USAGE:
  npx opencode-mobile qr <path-to-tunnels.json>
  npx opencode-mobile qr --file <path-to-tunnels.json>

OPTIONS:
  -f, --file   Path to tunnels.json
  -h, --help   Show this help message

OUTPUT:
  Prints an ASCII QR code and the tunnel URL.
`);
}

function isUrlString(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('http');
}

function findUrlFromValue(value: unknown, depth = 0): string | null {
  if (depth > 6) {
    return null;
  }

  if (isUrlString(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findUrlFromValue(item, depth + 1);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;

    for (const key of URL_KEYS) {
      if (isUrlString(record[key])) {
        return record[key] as string;
      }
    }

    for (const key of Object.keys(record)) {
      const found = findUrlFromValue(record[key], depth + 1);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

export async function main(args: string[] = process.argv.slice(2)): Promise<void> {
  const parsed = parseArgs(args);

  if (parsed.help || !parsed.filePath) {
    showHelp();
    process.exit(parsed.help ? 0 : 1);
  }

  const resolvedPath = path.resolve(process.cwd(), parsed.filePath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`[QR] File not found: ${resolvedPath}`);
    process.exit(1);
  }

  try {
    const raw = fs.readFileSync(resolvedPath, 'utf-8');
    const data = JSON.parse(raw) as unknown;
    const url = findUrlFromValue(data);

    if (!url) {
      console.error('[QR] No tunnel URL found in provided JSON.');
      process.exit(1);
    }

    const qr = await generateQRCodeAscii(url);
    if (qr) {
      console.log(`${qr}\n${url}`);
    } else {
      console.log(url);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[QR] Failed to read tunnel JSON: ${message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
