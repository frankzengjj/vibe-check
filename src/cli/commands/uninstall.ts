import chalk from "chalk";
import { uninstallHook } from "../../git/hook.js";

export async function uninstallCommand(): Promise<void> {
  try {
    const result = await uninstallHook();
    if (result.removed) {
      console.error(chalk.green(`✅ ${result.message}`));
    } else {
      console.error(chalk.yellow(`ℹ️  ${result.message}`));
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("not a git repository")) {
      console.error(chalk.red("Error: Not in a git repository."));
      process.exit(1);
    }
    throw error;
  }
}
