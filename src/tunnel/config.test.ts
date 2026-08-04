import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { getTunnelProvider } from './config.js';

const temporaryDirectories: string[] = [];

function writeConfig(config: unknown): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-mobile-'));
  temporaryDirectories.push(directory);
  const configPath = path.join(directory, 'tunnel-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config));
  return configPath;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('getTunnelProvider', () => {
  it('honors a persisted none provider', () => {
    const configPath = writeConfig({ provider: 'none' });

    expect(getTunnelProvider(undefined, configPath)).toBe('none');
  });

  it('lets the environment override persisted configuration', () => {
    const configPath = writeConfig({ provider: 'none' });

    expect(getTunnelProvider('cloudflare', configPath)).toBe('cloudflare');
  });

  it('defaults to auto for a missing or invalid configuration', () => {
    const configPath = path.join(os.tmpdir(), 'missing-opencode-mobile-config.json');

    expect(getTunnelProvider(undefined, configPath)).toBe('auto');
    expect(getTunnelProvider('invalid', configPath)).toBe('auto');
  });
});
