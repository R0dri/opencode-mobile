import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export const TUNNEL_PROVIDERS = [
  'cloudflare',
  'ngrok',
  'localtunnel',
  'auto',
  'none',
] as const;

export type TunnelProvider = (typeof TUNNEL_PROVIDERS)[number];

export function getTunnelConfigPath(homeDirectory = os.homedir()): string {
  return path.join(homeDirectory, '.config', 'opencode-mobile', 'tunnel-config.json');
}

function normalizeProvider(value: unknown): TunnelProvider | null {
  if (typeof value !== 'string') {
    return null;
  }

  const provider = value.toLowerCase() as TunnelProvider;
  return TUNNEL_PROVIDERS.includes(provider) ? provider : null;
}

export function getTunnelProvider(
  environmentProvider = process.env.TUNNEL_PROVIDER,
  configPath = getTunnelConfigPath(),
): TunnelProvider {
  const fromEnvironment = normalizeProvider(environmentProvider);
  if (fromEnvironment) {
    return fromEnvironment;
  }

  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as {
        provider?: unknown;
      };
      const fromConfig = normalizeProvider(config.provider);
      if (fromConfig) {
        return fromConfig;
      }
    }
  } catch {
    // Invalid or unreadable config falls back to the existing auto behavior.
  }

  return 'auto';
}
