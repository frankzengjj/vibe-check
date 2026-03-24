import { Command } from "commander";
import { initCommand } from "../src/cli/commands/init.js";
import { runCommand } from "../src/cli/commands/run.js";
import { configCommand } from "../src/cli/commands/config.js";
import { uninstallCommand } from "../src/cli/commands/uninstall.js";

const program = new Command();

program
  .name("vbc")
  .description(
    "Quiz yourself on your git diff before pushing — fight comprehension debt from vibe coding",
  )
  .version("0.1.0");

program
  .command("init")
  .description("Install the pre-push hook and configure AI endpoint")
  .action(initCommand);

program
  .command("run")
  .description("Analyze diff and quiz (called by the pre-push hook)")
  .option("--remote <name>", "Remote name (passed by git)")
  .option("--url <url>", "Remote URL (passed by git)")
  .option("--skip", "Skip the quiz and log a bypass")
  .action(runCommand);

program
  .command("config")
  .description("Show current configuration")
  .action(configCommand);

program
  .command("uninstall")
  .description("Remove the pre-push hook")
  .action(uninstallCommand);

program.parse();
