import chalk from "chalk";
import { loadConfig, USER_CONFIG_PATH } from "../../config/loader.js";
import { isHookInstalled } from "../../git/hook.js";

export async function configCommand(): Promise<void> {
  const config = await loadConfig();
  const hookInstalled = await isHookInstalled().catch(() => false);

  console.error(chalk.bold("vibe-check configuration:\n"));

  console.error(`  AI Base URL:   ${config.ai.baseUrl}`);
  console.error(`  AI Model:      ${config.ai.model}`);
  console.error(
    `  API Key:       ${config.ai.apiKey ? chalk.green("configured") : chalk.red("not set")}`,
  );
  console.error(`  Questions:     ${config.questionCount}`);
  console.error(`  Pass threshold: ${config.passThreshold}/${config.questionCount}`);
  console.error(`  Max retries:   ${config.maxRetries}`);
  console.error(`  Skip in CI:    ${config.skipInCI}`);
  console.error(
    `  Hook installed: ${hookInstalled ? chalk.green("yes") : chalk.red("no")}`,
  );
  console.error(`\n  Config file: ${USER_CONFIG_PATH}`);
}
