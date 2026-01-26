import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { applyEdits, modify, parse, type ParseError } from "jsonc-parser";

export type OpenCodeConfigFormat = "json" | "jsonc";

export interface InstallPluginOptions {
  dryRun?: boolean;
}

export interface InstallPluginResult {
  configPath: string;
  format: OpenCodeConfigFormat;
  action: "created" | "updated" | "noop";
  pluginSpec: string;
  pluginsBefore: string[];
  pluginsAfter: string[];
}

const OPENCODE_SCHEMA_URL = "https://opencode.ai/config.json";

function resolveGlobalConfigPath(): {
  configPath: string;
  format: OpenCodeConfigFormat;
  existed: boolean;
} {
  const dir = path.join(os.homedir(), ".config", "opencode");
  const jsoncPath = path.join(dir, "opencode.jsonc");
  const jsonPath = path.join(dir, "opencode.json");

  if (fs.existsSync(jsoncPath)) {
    return { configPath: jsoncPath, format: "jsonc", existed: true };
  }
  if (fs.existsSync(jsonPath)) {
    return { configPath: jsonPath, format: "json", existed: true };
  }
  return { configPath: jsonPath, format: "json", existed: false };
}

function normalizePluginList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  if (typeof value === "string") {
    return [value];
  }
  return [];
}

function upsertPlugin(plugins: string[], pluginSpec: string): { next: string[]; changed: boolean } {
  const name = pluginSpec.split("@")[0] || pluginSpec;
  const next = [...plugins];
  const existingIndex = next.findIndex((p) => p === name || p.startsWith(`${name}@`));
  if (existingIndex >= 0) {
    const changed = next[existingIndex] !== pluginSpec;
    next[existingIndex] = pluginSpec;
    return { next, changed };
  }

  next.push(pluginSpec);
  return { next, changed: true };
}

function ensureTrailingNewline(content: string): string {
  return content.endsWith("\n") ? content : `${content}\n`;
}

export function installPluginToGlobalOpenCodeConfig(
  pluginSpec: string,
  options: InstallPluginOptions = {},
): InstallPluginResult {
  const { configPath, format, existed } = resolveGlobalConfigPath();
  const dir = path.dirname(configPath);

  if (!existed) {
    const pluginsBefore: string[] = [];
    const { next: pluginsAfter } = upsertPlugin(pluginsBefore, pluginSpec);
    const initial = {
      $schema: OPENCODE_SCHEMA_URL,
      plugin: pluginsAfter,
    };

    if (!options.dryRun) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify(initial, null, 2) + "\n", "utf-8");
    }

    return {
      configPath,
      format,
      action: "created",
      pluginSpec,
      pluginsBefore,
      pluginsAfter,
    };
  }

  const raw = fs.readFileSync(configPath, "utf-8");
  const errors: ParseError[] = [];
  const parsed: unknown = parse(raw, errors, { allowTrailingComma: true });
  if (errors.length > 0) {
    const first = errors[0];
    throw new Error(
      `Failed to parse ${configPath} (offset ${first.offset}, length ${first.length}). ` +
        "Fix the JSON/JSONC and retry.",
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Unexpected OpenCode config shape in ${configPath}. Expected an object.`);
  }

  const configObj = parsed as Record<string, unknown>;
  const pluginsBefore = normalizePluginList(configObj.plugin);
  const { next: pluginsAfter, changed } = upsertPlugin(pluginsBefore, pluginSpec);

  if (!changed) {
    return {
      configPath,
      format,
      action: "noop",
      pluginSpec,
      pluginsBefore,
      pluginsAfter,
    };
  }

  const edits = modify(raw, ["plugin"], pluginsAfter, {
    formattingOptions: {
      insertSpaces: true,
      tabSize: 2,
      eol: "\n",
    },
  });
  const updated = ensureTrailingNewline(applyEdits(raw, edits));

  if (!options.dryRun) {
    fs.writeFileSync(configPath, updated, "utf-8");
  }

  return {
    configPath,
    format,
    action: "updated",
    pluginSpec,
    pluginsBefore,
    pluginsAfter,
  };
}
