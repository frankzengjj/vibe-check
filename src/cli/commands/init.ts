import { writeFile, mkdir } from "node:fs/promises";
import chalk from "chalk";
import { installHook } from "../../git/hook.js";
import { loadConfig, USER_CONFIG_DIR, USER_CONFIG_PATH } from "../../config/loader.js";
import { isTTYAvailable, askQuestion } from "../prompt.js";
import { createInterface } from "node:readline";
import { createReadStream } from "node:fs";

async function promptForConfig(): Promise<void> {
  const config = await loadConfig();

  // If API key is already set, skip setup
  if (config.ai.apiKey) return;

  if (!isTTYAvailable()) {
    console.error(
      chalk.yellow(
        "No TTY available. Set VIBE_CHECK_API_KEY, VIBE_CHECK_BASE_URL, and VIBE_CHECK_MODEL env vars.",
      ),
    );
    return;
  }

  const ttyPath = process.platform === "win32" ? "CON" : "/dev/tty";
  const rl = createInterface({
    input: createReadStream(ttyPath),
    output: process.stderr,
  });

  console.error(chalk.bold("\nAI endpoint configuration:\n"));

  const baseUrl = await askQuestion(
    rl,
    `Base URL (${chalk.dim(config.ai.baseUrl)}): `,
  );
  const model = await askQuestion(
    rl,
    `Model (${chalk.dim(config.ai.model)}): `,
  );
  const apiKey = await askQuestion(rl, "API key: ");

  rl.close();

  const userConfig = {
    ai: {
      baseUrl: baseUrl || config.ai.baseUrl,
      model: model || config.ai.model,
      apiKey: apiKey || "",
    },
  };

  if (userConfig.ai.apiKey) {
    await mkdir(USER_CONFIG_DIR, { recursive: true });
    await writeFile(USER_CONFIG_PATH, JSON.stringify(userConfig, null, 2) + "\n");
    console.error(chalk.green(`\nConfig saved to ${USER_CONFIG_PATH}`));
  } else {
    console.error(
      chalk.yellow(
        "\nNo API key provided. Set VIBE_CHECK_API_KEY env var before pushing.",
      ),
    );
  }
}

export async function initCommand(): Promise<void> {
  console.error(chalk.bold("🔍 vibe-check: Setting up...\n"));

  try {
    const result = await installHook();
    if (result.installed) {
      console.error(chalk.green(`✅ ${result.message}`));
    } else {
      console.error(chalk.yellow(`ℹ️  ${result.message}`));
    }

    await promptForConfig();

    console.error(chalk.bold("\n🚀 vibe-check is ready! Try pushing some code."));
  } catch (error) {
    if (error instanceof Error && error.message.includes("not a git repository")) {
      console.error(chalk.red("Error: Not in a git repository. Run this from a git project root."));
      process.exit(1);
    }
    throw error;
  }
}
