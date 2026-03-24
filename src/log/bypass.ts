import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";

const LOG_DIR = join(homedir(), ".vibe-check");
const LOG_PATH = join(LOG_DIR, "bypass.log");

export async function logBypass(remote: string, url: string): Promise<void> {
  let repo = "";
  let branch = "";

  try {
    repo = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
    }).trim();
    branch = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
    }).trim();
  } catch {
    // best-effort
  }

  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    repo,
    branch,
    remote,
    url,
  });

  await mkdir(LOG_DIR, { recursive: true });
  await appendFile(LOG_PATH, entry + "\n");
}
