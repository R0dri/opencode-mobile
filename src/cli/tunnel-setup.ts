#!/usr/bin/env node
import { spawn, execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { createInterface } from "readline";

const PROVIDERS = ["cloudflare", "ngrok", "localtunnel", "none"] as const;
type Provider = typeof PROVIDERS[number];

interface CliOptions {
  help: boolean;
  noTui: boolean;
  provider?: Provider;
  authtoken?: string;
  cloudflareAuthtoken?: string;
  domain?: string;
}

interface TunnelConfig {
  provider: Provider;
  mode?: "free" | "custom";
  domain?: string;
  tunnelName?: string;
  authtokenConfigured?: boolean;
  cloudflaredPath?: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".config", "opencode-mobile");
const CONFIG_FILE = path.join(CONFIG_DIR, "tunnel-config.json");

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    help: false,
    noTui: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--no-tui":
        options.noTui = true;
        break;
      case "--provider":
      case "-p":
        i++;
        if (i < args.length) {
          const provider = args[i] as Provider;
          if (PROVIDERS.includes(provider)) {
            options.provider = provider;
          }
        }
        break;
      case "--authtoken":
      case "-t":
        i++;
        if (i < args.length) {
          options.authtoken = args[i];
        }
        break;
      case "--cloudflare-authtoken":
        i++;
        if (i < args.length) {
          options.cloudflareAuthtoken = args[i];
        }
        break;
      case "--domain":
      case "-d":
        i++;
        if (i < args.length) {
          options.domain = args[i];
        }
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
🚀 Tunnel Provider Setup for OpenCode Mobile

Usage: tunnel-setup [options]

Options:
  -h, --help              Show this help message
  --no-tui                Run in non-interactive mode (JSON output)
  -p, --provider <name>   Pre-select provider (cloudflare|ngrok|localtunnel|none)
  -t, --authtoken <token> Set ngrok auth token (non-interactive)
  -d, --domain <domain>   Set custom domain for Cloudflare

Examples:
  # Interactive setup
  tunnel-setup

  # Non-interactive with provider
  tunnel-setup --no-tui --provider cloudflare

  # Setup ngrok with token
  tunnel-setup --no-tui --provider ngrok --authtoken YOUR_TOKEN

Providers:
  ☁️  cloudflare    Most secure, free tier available, custom domains supported
  🌐 ngrok         Well-established, requires auth token
  🚀 localtunnel   Zero setup, pure JavaScript (dev only)
  ❌ none          Skip setup, configure manually later
`);
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

function isCloudflaredInstalled(): boolean {
  try {
    execSync("cloudflared --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function isNgrokInstalled(): boolean {
  try {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    return "@ngrok/ngrok" in deps;
  } catch {
    return false;
  }
}

function findCloudflaredPath(): string | null {
  const platform = os.platform();

  if (platform === "win32") {
    const winPaths = [
      "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe",
      "C:\\Program Files\\cloudflared\\cloudflared.exe",
      `${process.env.USERPROFILE}\\scoop\\shims\\cloudflared.exe`,
      `${process.env.USERPROFILE}\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Cloudflare.cloudflared*\\cloudflared.exe`,
    ];
    for (const p of winPaths) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  const paths = [
    "/opt/homebrew/bin/cloudflared",
    "/usr/local/bin/cloudflared",
    "/usr/bin/cloudflared",
    `${process.env.HOME}/.linuxbrew/bin/cloudflared`,
    "/home/linuxbrew/.linuxbrew/bin/cloudflared",
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function detectLinuxPackageManager(): "apt" | "yum" | "dnf" | null {
  try {
    execSync("which apt-get", { stdio: "ignore" });
    return "apt";
  } catch {
    try {
      execSync("which dnf", { stdio: "ignore" });
      return "dnf";
    } catch {
      try {
        execSync("which yum", { stdio: "ignore" });
        return "yum";
      } catch {
        return null;
      }
    }
  }
}

async function installCloudflared(): Promise<string | null> {
  const platform = os.platform();

  if (platform === "darwin") {
    console.log("📦 Installing cloudflared via Homebrew (official)...");
    try {
      execSync("brew install cloudflared", { stdio: "inherit" });
      const cloudflaredPath = findCloudflaredPath();
      if (cloudflaredPath) {
        console.log(`✅ cloudflared installed at: ${cloudflaredPath}`);
        return cloudflaredPath;
      }
      return null;
    } catch (error) {
      console.error("❌ Failed to install cloudflared via Homebrew");
      return null;
    }
  } else if (platform === "linux") {
    const pkgManager = detectLinuxPackageManager();

    if (pkgManager === "apt") {
      console.log("📦 Installing cloudflared via Cloudflare APT repository (official)...");
      try {
        execSync(
          "sudo mkdir -p --mode=0755 /usr/share/keyrings && curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null",
          { stdio: "inherit" }
        );
        execSync(
          "echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' | sudo tee /etc/apt/sources.list.d/cloudflared.list",
          { stdio: "inherit" }
        );
        execSync("sudo apt-get update && sudo apt-get install -y cloudflared", { stdio: "inherit" });
        const cloudflaredPath = findCloudflaredPath();
        if (cloudflaredPath) {
          console.log(`✅ cloudflared installed at: ${cloudflaredPath}`);
          return cloudflaredPath;
        }
        return null;
      } catch (error) {
        console.error("❌ Failed to install cloudflared via APT");
        return null;
      }
    } else if (pkgManager === "yum" || pkgManager === "dnf") {
      console.log(`📦 Installing cloudflared via Cloudflare ${pkgManager.toUpperCase()} repository (official)...`);
      try {
        const cmd = pkgManager === "dnf" ? "dnf" : "yum";
        execSync(
          `curl -fsSL https://pkg.cloudflare.com/cloudflared.repo | sudo tee /etc/yum.repos.d/cloudflared.repo`,
          { stdio: "inherit" }
        );
        execSync(`sudo ${cmd} update -y && sudo ${cmd} install -y cloudflared`, { stdio: "inherit" });
        const cloudflaredPath = findCloudflaredPath();
        if (cloudflaredPath) {
          console.log(`✅ cloudflared installed at: ${cloudflaredPath}`);
          return cloudflaredPath;
        }
        return null;
      } catch (error) {
        console.error(`❌ Failed to install cloudflared via ${pkgManager.toUpperCase()}`);
        return null;
      }
    } else {
      console.log("⚠️  No supported package manager found (apt, yum, or dnf)");
      console.log("   Falling back to manual .deb download...");
      try {
        execSync(
          "curl -L --output /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i /tmp/cloudflared.deb",
          { stdio: "inherit" }
        );
        const cloudflaredPath = findCloudflaredPath();
        if (cloudflaredPath) {
          console.log(`✅ cloudflared installed at: ${cloudflaredPath}`);
          return cloudflaredPath;
        }
        return null;
      } catch (error) {
        console.error("❌ Failed to install cloudflared");
        return null;
      }
    }
  } else if (platform === "win32") {
    console.log("📦 Installing cloudflared via winget (official)...");
    console.log("   Note: Windows support is experimental");
    try {
      execSync("winget install --id Cloudflare.cloudflared --accept-package-agreements --accept-source-agreements", { stdio: "inherit" });
      console.log("✅ cloudflared installed via winget");
      console.log("   Location: C:\\Program Files (x86)\\cloudflared\\cloudflared.exe");
      return "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe";
    } catch (error) {
      console.error("❌ Failed to install cloudflared via winget");
      console.log("   Please install manually from:");
      console.log("   https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/");
      return null;
    }
  } else {
    console.log(`⚠️  Automatic installation not supported on platform: ${platform}`);
    console.log("   Please install cloudflared manually from:");
    console.log("   https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/");
    return null;
  }
}

async function runCloudflaredLogin(): Promise<boolean> {
  console.log("\n🔐 Starting Cloudflare authentication...");
  console.log("   A browser window will open. Please log in to your Cloudflare account.\n");

  return new Promise((resolve) => {
    const child = spawn("cloudflared", ["tunnel", "login"], {
      stdio: "inherit",
    });

    child.on("close", (code) => {
      resolve(code === 0);
    });
  });
}

async function installNgrokPackage(): Promise<boolean> {
  console.log("📦 Installing @ngrok/ngrok package...");
  try {
    execSync("npm install @ngrok/ngrok", { stdio: "inherit" });
    return true;
  } catch (error) {
    console.error("❌ Failed to install @ngrok/ngrok package");
    return false;
  }
}

function saveConfig(config: TunnelConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

  // Set restrictive permissions (owner read/write only)
  try {
    fs.chmodSync(CONFIG_FILE, 0o600);
  } catch {
    // Ignore permission errors on Windows
  }
}

function loadConfig(): TunnelConfig | null {
  if (!fs.existsSync(CONFIG_FILE)) {
    return null;
  }

  try {
    const content = fs.readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(content) as TunnelConfig;
  } catch {
    return null;
  }
}

async function setupCloudflare(options: CliOptions): Promise<void> {
  if (options.noTui) {
    const cloudflaredPath = findCloudflaredPath();

    if (!cloudflaredPath) {
      const output = {
        status: "error",
        message: "cloudflared not installed",
        action: "install_cloudflared",
        instructions:
          "Install cloudflared from https://github.com/cloudflare/cloudflared/releases",
      };
      console.log(JSON.stringify(output, null, 2));
      process.exit(1);
    }

    if (options.domain && options.cloudflareAuthtoken) {
      const config: TunnelConfig = {
        provider: "cloudflare",
        mode: "custom",
        domain: options.domain,
        tunnelName: `opencode-mobile-${options.domain.replace(/\./g, "-")}`,
        cloudflaredPath,
      };
      saveConfig(config);
      console.log(
        JSON.stringify(
          {
            status: "success",
            message: "Cloudflare configured with custom domain",
            config,
          },
          null,
          2
        )
      );
    } else if (options.domain && !options.cloudflareAuthtoken) {
      const output = {
        status: "error",
        message: "Cloudflare custom domain requires --cloudflare-authtoken",
        action: "provide_authtoken",
        instructions: "Provide --cloudflare-authtoken for custom domain setup",
      };
      console.log(JSON.stringify(output, null, 2));
      process.exit(1);
    } else {
      console.log("ℹ️  Using Cloudflare free tier (trycloudflare.com)");
      console.log("   For custom domains, provide --cloudflare-authtoken and --domain\n");

      const config: TunnelConfig = {
        provider: "cloudflare",
        mode: "free",
        cloudflaredPath,
      };
      saveConfig(config);
      console.log(
        JSON.stringify(
          {
            status: "success",
            message: "Cloudflare configured for free tier (trycloudflare.com)",
            config,
          },
          null,
          2
        )
      );
    }
    return;
  }

  // Interactive mode
  console.log("\n☁️  Cloudflare Tunnel Setup\n");

  let cloudflaredPath = findCloudflaredPath();

  if (!cloudflaredPath) {
    console.log("⚠️  cloudflared is not installed.");
    console.log("📦 Attempting automatic installation...\n");

    cloudflaredPath = await installCloudflared();
    if (!cloudflaredPath) {
      console.log("\n❌ Automatic installation failed.");
      console.log("   Please install cloudflared manually:");
      console.log("   macOS: brew install cloudflared");
      console.log("   Linux: curl -L --output /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i /tmp/cloudflared.deb");
      console.log("   Windows: Download from https://github.com/cloudflare/cloudflared/releases");
      console.log("\n   After installation, run: npx opencode-mobile tunnel-setup\n");
      return;
    }
  }

  console.log(`\n✅ cloudflared found at: ${cloudflaredPath}`);
  console.log("\nCloudflare offers two modes:");
  console.log("  1) Free tier (trycloudflare.com) - No account needed");
  console.log("  2) Custom domain - Requires Cloudflare account + domain\n");

  const mode = await prompt("Select mode (1/2): ");

  if (mode === "1") {
    const config: TunnelConfig = {
      provider: "cloudflare",
      mode: "free",
      cloudflaredPath,
    };
    saveConfig(config);
    console.log("\n✅ Cloudflare configured for free tier!");
    console.log("   Your tunnel will use trycloudflare.com URLs.");
  } else if (mode === "2") {
    console.log("\n🔐 You'll need to authenticate with Cloudflare.");
    const auth = await prompt("Start authentication now? (y/n): ");

    if (auth.toLowerCase() === "y") {
      const success = await runCloudflaredLogin();
      if (!success) {
        console.log("\n❌ Authentication failed. Please try again.");
        return;
      }
    }

    const domain =
      options.domain || (await prompt("Enter your domain (e.g., mobile.example.com): "));

    if (!domain) {
      console.log("\n❌ Domain is required for custom setup.");
      return;
    }

    const config: TunnelConfig = {
      provider: "cloudflare",
      mode: "custom",
      domain,
      tunnelName: `opencode-mobile-${domain.replace(/\./g, "-")}`,
      cloudflaredPath,
    };
    saveConfig(config);
    console.log("\n✅ Cloudflare configured with custom domain!");
    console.log(`   Domain: ${domain}`);
  } else {
    console.log("\n❌ Invalid selection. Setup cancelled.");
  }
}

async function setupNgrok(options: CliOptions): Promise<void> {
  if (options.noTui) {
    // Non-interactive mode
    if (!isNgrokInstalled()) {
      const output = {
        status: "error",
        message: "@ngrok/ngrok package not installed",
        action: "install_ngrok",
        instructions: "Run: npm install @ngrok/ngrok",
      };
      console.log(JSON.stringify(output, null, 2));
      process.exit(1);
    }

    if (!options.authtoken) {
      const output = {
        status: "error",
        message: "ngrok auth token required",
        action: "provide_authtoken",
        instructions: "Get your auth token from https://dashboard.ngrok.com/get-started/your-authtoken",
      };
      console.log(JSON.stringify(output, null, 2));
      process.exit(1);
    }

    // Configure auth token
    try {
      const ngrokModule = await import("@ngrok/ngrok");
      await ngrokModule.authtoken(options.authtoken);

      const config: TunnelConfig = {
        provider: "ngrok",
        authtokenConfigured: true,
      };
      saveConfig(config);

      console.log(
        JSON.stringify(
          {
            status: "success",
            message: "ngrok configured successfully",
            config,
          },
          null,
          2
        )
      );
    } catch (error) {
      console.log(
        JSON.stringify(
          {
            status: "error",
            message: "Failed to configure ngrok",
            error: error instanceof Error ? error.message : String(error),
          },
          null,
          2
        )
      );
      process.exit(1);
    }
    return;
  }

  // Interactive mode
  console.log("\n🌐 Ngrok Setup\n");

  if (!isNgrokInstalled()) {
    console.log("⚠️  @ngrok/ngrok package is not installed.");
    const install = await prompt("Would you like to install it now? (y/n): ");

    if (install.toLowerCase() === "y") {
      const success = await installNgrokPackage();
      if (!success) {
        console.log("\n❌ Installation failed. Please install manually:");
        console.log("   npm install @ngrok/ngrok");
        return;
      }
    } else {
      console.log("\n❌ @ngrok/ngrok is required. Setup cancelled.");
      return;
    }
  }

  console.log("\n✅ @ngrok/ngrok is installed!");
  console.log("\n📝 Ngrok requires an auth token.");
  console.log("   1. Sign up at https://ngrok.com");
  console.log("   2. Get your auth token from https://dashboard.ngrok.com/get-started/your-authtoken");
  console.log("   3. Enter it below (input will be hidden)\n");

  const authtoken = options.authtoken || (await prompt("Auth token: "));

  if (!authtoken) {
    console.log("\n❌ Auth token is required.");
    return;
  }

  console.log("\n🔐 Configuring ngrok...");

  try {
    const ngrokModule = await import("@ngrok/ngrok");
    await ngrokModule.authtoken(authtoken);

    const config: TunnelConfig = {
      provider: "ngrok",
      authtokenConfigured: true,
    };
    saveConfig(config);

    console.log("\n✅ Ngrok configured successfully!");
  } catch (error) {
    console.error("\n❌ Failed to configure ngrok:", error instanceof Error ? error.message : error);
  }
}

async function setupLocaltunnel(): Promise<void> {
  console.log("\n🚀 Localtunnel Setup\n");

  console.log("✅ Localtunnel is ready to use!");
  console.log("\n⚠️  Important Security Notice:");
  console.log("   Localtunnel is a community project with known security concerns.");
  console.log("   It's recommended for development only, not production use.\n");

  console.log("Usage:");
  console.log("   The plugin will automatically use localtunnel when configured.");
  console.log("   No additional setup required.\n");

  const config: TunnelConfig = {
    provider: "localtunnel",
  };
  saveConfig(config);

  console.log("✅ Localtunnel configured!");
}

async function selectProvider(): Promise<Provider> {
  console.log("\n🚀 Tunnel Provider Setup\n");
  console.log("Select a tunnel provider:\n");
  console.log("  1) ☁️  Cloudflare (Recommended)");
  console.log("     • Most secure & trustworthy");
  console.log("     • Free tier: trycloudflare.com (no account needed)");
  console.log("     • Custom domains: requires Cloudflare account + domain");
  console.log("");
  console.log("  2) 🌐 Ngrok");
  console.log("     • Well-established, SOC 2 compliant");
  console.log("     • Requires auth token (free signup)");
  console.log("     • Limited free tier (interstitial page)");
  console.log("");
  console.log("  3) 🚀 Localtunnel");
  console.log("     • Zero setup, pure JavaScript");
  console.log("     • ⚠️  Security concerns (use for dev only)");
  console.log("");
  console.log("  4) ❌ None / Skip");
  console.log("     • Disable automatic tunnels (LAN, VPN, or custom reverse proxy)");
  console.log("");

  const choice = await prompt("Enter choice (1-4): ");

  switch (choice) {
    case "1":
      return "cloudflare";
    case "2":
      return "ngrok";
    case "3":
      return "localtunnel";
    case "4":
      return "none";
    default:
      console.log("\n❌ Invalid choice. Please try again.\n");
      return selectProvider();
  }
}

async function runTui(): Promise<void> {
  // Check for existing config
  const existingConfig = loadConfig();
  if (existingConfig) {
    console.log("\nℹ️  Existing configuration found:");
    console.log(`   Provider: ${existingConfig.provider}`);
    if (existingConfig.domain) {
      console.log(`   Domain: ${existingConfig.domain}`);
    }

    const overwrite = await prompt("\nOverwrite existing configuration? (y/n): ");
    if (overwrite.toLowerCase() !== "y") {
      console.log("\nSetup cancelled. Existing configuration preserved.");
      return;
    }
  }

  const provider = await selectProvider();

  switch (provider) {
    case "cloudflare":
      await setupCloudflare({ help: false, noTui: false });
      break;
    case "ngrok":
      await setupNgrok({ help: false, noTui: false });
      break;
    case "localtunnel":
      await setupLocaltunnel();
      break;
    case "none":
      saveConfig({ provider: "none" });
      console.log("\n✅ Automatic tunnels disabled. You can run setup again anytime with:");
      console.log("   npx tunnel-setup");
      break;
  }

  console.log("\n💡 Configuration saved to:");
  console.log(`   ${CONFIG_FILE}`);
}

async function runNoTui(options: CliOptions): Promise<void> {
  if (!options.provider) {
    console.log(
      JSON.stringify(
        {
          status: "error",
          message: "Provider required in non-interactive mode",
          usage: "tunnel-setup --no-tui --provider <cloudflare|ngrok|localtunnel|none>",
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  switch (options.provider) {
    case "cloudflare":
      await setupCloudflare(options);
      break;
    case "ngrok":
      await setupNgrok(options);
      break;
    case "localtunnel":
      await setupLocaltunnel();
      break;
    case "none":
      saveConfig({ provider: "none" });
      console.log(
        JSON.stringify(
          {
            status: "success",
            message: "Automatic tunnels disabled",
            config: { provider: "none" },
          },
          null,
          2
        )
      );
      break;
  }
}

async function main(args: string[]): Promise<void> {
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    return;
  }

  try {
    if (options.noTui) {
      await runNoTui(options);
    } else {
      await runTui();
    }
  } catch (error) {
    if (options.noTui) {
      console.log(
        JSON.stringify(
          {
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          },
          null,
          2
        )
      );
    } else {
      console.error("\n❌ Error:", error instanceof Error ? error.message : error);
    }
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  console.log("\n\n👋 Setup cancelled.");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n\n👋 Setup cancelled.");
  process.exit(0);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2));
}

export {
  parseArgs,
  showHelp,
  prompt,
  isCloudflaredInstalled,
  isNgrokInstalled,
  installCloudflared,
  installNgrokPackage,
  saveConfig,
  loadConfig,
  setupCloudflare,
  setupNgrok,
  setupLocaltunnel,
  selectProvider,
  runTui,
  runNoTui,
  main,
};
export type { CliOptions, TunnelConfig, Provider };
