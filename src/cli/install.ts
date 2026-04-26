import { installPluginToGlobalOpenCodeConfig, installGlobalCommand } from "./opencode-config.js";
import { MOBILE_COMMAND_NAME, getMobileCommandMarkdown } from "./mobile-command.js";
import { checkForUpdates, executeUpdate } from "./version-check.js";
import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as url from "url";
import { createInterface } from "readline";

const PLUGIN_SPEC = "opencode-mobile@latest";

const VALID_PROVIDERS = ["cloudflare", "ngrok", "localtunnel", "auto", "none"] as const;

const TUNNEL_CONFIG_DIR = path.join(os.homedir(), ".config", "opencode-mobile");
const TUNNEL_CONFIG_FILE = path.join(TUNNEL_CONFIG_DIR, "tunnel-config.json");

/**
 * Persist the user's --provider choice so the plugin can read it at runtime.
 *
 * Writing here is intentionally additive: tunnel-setup also writes this file with
 * provider-specific extras (cloudflaredPath, mode, etc). We only persist a minimal
 * `{ provider }` record when the install command itself is invoked with --provider
 * but tunnel-setup didn't run (e.g. --skip-tunnel-setup, or "none").
 */
function persistProviderChoice(provider: string, dryRun: boolean): void {
  const normalized = provider.toLowerCase();
  if (!VALID_PROVIDERS.includes(normalized as (typeof VALID_PROVIDERS)[number])) {
    return;
  }
  if (normalized === "none") {
    return;
  }
  if (dryRun) {
    console.log(`[Dry Run] Would persist tunnel provider "${normalized}" to ${TUNNEL_CONFIG_FILE}`);
    return;
  }

  try {
    if (!fs.existsSync(TUNNEL_CONFIG_DIR)) {
      fs.mkdirSync(TUNNEL_CONFIG_DIR, { recursive: true });
    }

    let existing: Record<string, unknown> = {};
    if (fs.existsSync(TUNNEL_CONFIG_FILE)) {
      try {
        existing = JSON.parse(fs.readFileSync(TUNNEL_CONFIG_FILE, "utf-8")) as Record<string, unknown>;
      } catch {
        existing = {};
      }
    }

    const merged = { ...existing, provider: normalized };
    fs.writeFileSync(TUNNEL_CONFIG_FILE, JSON.stringify(merged, null, 2));
    try {
      fs.chmodSync(TUNNEL_CONFIG_FILE, 0o600);
    } catch {
      // Ignore permission errors on Windows
    }
    console.log(`✅ Persisted tunnel provider "${normalized}" to ${TUNNEL_CONFIG_FILE}`);
  } catch (error) {
    console.error("⚠️  Failed to persist tunnel provider choice:", error instanceof Error ? error.message : error);
  }
}

type InstallCliOptions = {
  help: boolean;
  dryRun: boolean;
  skipTunnelSetup: boolean;
  skipCommandInstall: boolean;
  skipUpdateCheck: boolean;
  provider?: string;
  cloudflareAuthtoken?: string;
  domain?: string;
  ngrokAuthtoken?: string;
  yes: boolean;
};

function parseArgs(args: string[]): InstallCliOptions {
  const options: InstallCliOptions = {
    help: false,
    dryRun: false,
    skipTunnelSetup: false,
    skipCommandInstall: false,
    skipUpdateCheck: false,
    yes: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--skip-tunnel-setup") {
      options.skipTunnelSetup = true;
    } else if (arg === "--skip-command-install") {
      options.skipCommandInstall = true;
    } else if (arg === "--skip-update-check") {
      options.skipUpdateCheck = true;
    } else if (arg === "--provider" || arg === "-p") {
      i++;
      if (i < args.length) {
        options.provider = args[i];
      }
    } else if (arg === "--cloudflare-authtoken") {
      i++;
      if (i < args.length) {
        options.cloudflareAuthtoken = args[i];
      }
    } else if (arg === "--domain" || arg === "-d") {
      i++;
      if (i < args.length) {
        options.domain = args[i];
      }
    } else if (arg === "--ngrok-authtoken" || arg === "-t") {
      i++;
      if (i < args.length) {
        options.ngrokAuthtoken = args[i];
      }
    } else if (arg === "--yes" || arg === "-y") {
      options.yes = true;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
OpenCode Mobile Plugin - Installer

USAGE:
  npx opencode-mobile install [OPTIONS]
  npx opencode-mobile@<version> install [OPTIONS]

OPTIONS:
  --dry-run                 Print changes without writing files
  --skip-tunnel-setup       Skip tunnel provider setup
  --skip-command-install    Skip installing the /mobile command globally
  --skip-update-check       Skip checking for newer versions
  -p, --provider <name>     Pre-select provider (cloudflare|ngrok|localtunnel|none)
  --cloudflare-authtoken    Cloudflare auth token (for custom domains)
  -d, --domain <domain>     Custom domain (requires --cloudflare-authtoken)
  -t, --ngrok-authtoken     Ngrok auth token
  -y, --yes                 Auto-accept all prompts
  -h, --help                Show this help message

WHAT IT DOES:
  1. Adds "${PLUGIN_SPEC}" to the "plugin" array in your global OpenCode config
  2. Installs the "/mobile" command globally (available in all projects)
  3. (Optional) Runs tunnel provider setup for mobile push notifications

EXAMPLES:
  npx opencode-mobile install
  npx opencode-mobile@1.3.3 install
  npx opencode-mobile install --skip-update-check
  npx opencode-mobile install --yes --provider cloudflare
  npx opencode-mobile install --provider cloudflare --cloudflare-authtoken TOKEN --domain my.example.com
  npx opencode-mobile install --provider ngrok --ngrok-authtoken TOKEN

CONFIG LOCATION:
  ~/.config/opencode/opencode.json (or opencode.jsonc)

COMMAND LOCATION:
  ~/.config/opencode/commands/mobile.md
`);
}

async function runTunnelSetup(options: InstallCliOptions): Promise<void> {
  return new Promise((resolve) => {
    console.log("\n🚀 Setting up tunnel provider for mobile notifications...\n");

    const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
    const tunnelSetupPath = path.resolve(__dirname, "..", "cli", "tunnel-setup.js");

    const args = [tunnelSetupPath];

    if (options.provider) {
      args.push("--provider", options.provider);
    }
    if (options.cloudflareAuthtoken) {
      args.push("--cloudflare-authtoken", options.cloudflareAuthtoken);
    }
    if (options.domain) {
      args.push("--domain", options.domain);
    }
    if (options.ngrokAuthtoken) {
      args.push("--authtoken", options.ngrokAuthtoken);
    }

    if (options.provider || options.yes) {
      args.push("--no-tui");
    }

    const child = spawn("node", args, {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.log("\n⚠️  Tunnel setup exited with code", code);
        console.log("   You can run it later with: npx opencode-mobile tunnel-setup\n");
      }
      resolve();
    });
  });
}

function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function checkVersionAndPrompt(autoYes: boolean): Promise<boolean> {
  try {
    console.log("🔍 Checking for updates...\n");
    const versionInfo = await checkForUpdates();

    if (versionInfo.updateAvailable) {
      console.log(`📦 A new version is available!`);
      console.log(`   Your version: ${versionInfo.currentVersion}`);
      console.log(`   Latest:       ${versionInfo.latestVersion}\n`);

      if (autoYes) {
        console.log("📥 Auto-updating (--yes flag set)...\n");
        const success = await executeUpdate();
        return success;
      }

      const answer = await prompt("Would you like to update? (y/n): ");

      if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
        console.log("\n📥 Updating...\n");
        const success = await executeUpdate();
        return success;
      } else {
        console.log("\n⏩ Continuing with current version...\n");
        return false;
      }
    }
  } catch {}
  return false;
}

export async function main(args: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(args);
  if (options.help) {
    showHelp();
    return;
  }

  if (!options.dryRun && !options.skipUpdateCheck) {
    await checkVersionAndPrompt(options.yes);
  }

  const prefix = options.dryRun ? "[Dry Run] " : "";

  // Install plugin to global config
  const result = installPluginToGlobalOpenCodeConfig(PLUGIN_SPEC, { dryRun: options.dryRun });

  if (result.action === "noop") {
    console.log(`${prefix}✅ ${PLUGIN_SPEC} already present in ${result.configPath}`);
  } else if (result.action === "created") {
    console.log(`${prefix}✅ Created ${result.configPath}`);
    console.log(`${prefix}   plugin: ${JSON.stringify(result.pluginsAfter)}`);
  } else {
    console.log(`${prefix}✅ Updated ${result.configPath}`);
    console.log(`${prefix}   plugin: ${JSON.stringify(result.pluginsAfter)}`);
  }

  // Install global command
  if (!options.skipCommandInstall) {
    const commandContent = getMobileCommandMarkdown();
    const commandResult = installGlobalCommand(MOBILE_COMMAND_NAME, commandContent, {
      dryRun: options.dryRun,
    });

    if (commandResult.action === "created") {
      console.log(`${prefix}✅ Created /${MOBILE_COMMAND_NAME} command at ${commandResult.commandPath}`);
    } else if (commandResult.action === "updated") {
      console.log(`${prefix}✅ Updated /${MOBILE_COMMAND_NAME} command at ${commandResult.commandPath}`);
    } else {
      console.log(`${prefix}✅ /${MOBILE_COMMAND_NAME} command already up to date`);
    }
  }

  if (!options.dryRun && !options.skipTunnelSetup) {
    await runTunnelSetup(options);
  }

  // Persist --provider choice even if tunnel-setup didn't run (e.g. --skip-tunnel-setup
  // or provider === "none"). This ensures the runtime plugin can pick it up via
  // ~/.config/opencode-mobile/tunnel-config.json without needing TUNNEL_PROVIDER env var.
  if (options.provider) {
    persistProviderChoice(options.provider, options.dryRun);
  }

  console.log(`${prefix}\n🎉 Installation complete!`);
  console.log(`${prefix}`);
  console.log(`${prefix}⚠️  IMPORTANT: Mobile features only work in \`opencode serve\` mode.`);
  console.log(`${prefix}   The plain \`opencode\` TUI does NOT auto-start the tunnel, and`);
  console.log(`${prefix}   \`/mobile\` will respond with "No tunnel URL found".`);
  console.log(`${prefix}`);
  console.log(`${prefix}   Start OpenCode with LAN access enabled so your phone can reach it:`);
  console.log(`${prefix}     opencode serve --hostname 0.0.0.0 --port 4096`);
  console.log(`${prefix}`);
  console.log(`${prefix}   The default --hostname is 127.0.0.1, which is loopback-only and`);
  console.log(`${prefix}   not reachable from a phone on your LAN. Use 0.0.0.0 to bind all`);
  console.log(`${prefix}   interfaces. (Make sure your firewall allows the chosen port.)`);
  console.log(`${prefix}`);
  console.log(`${prefix}   Then use \`/mobile\` in any project to display the QR code.`);
}
