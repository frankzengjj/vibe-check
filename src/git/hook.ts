import { readFile, writeFile, chmod, stat } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const HOOK_MARKER = "# vibe-check pre-push hook";

function getGitDir(): string {
  return execSync("git rev-parse --git-dir", { encoding: "utf-8" }).trim();
}

function generateHookScript(): string {
  return `#!/bin/sh
${HOOK_MARKER}
# This hook is managed by vibe-check. Do not edit manually.
# To remove: vibe-check uninstall

if [ "\$VIBE_CHECK_SKIP" = "1" ]; then
    echo "[vibe-check] Skipped via VIBE_CHECK_SKIP=1. Logging bypass." >&2
    npx vbc run --skip --remote "\$1" --url "\$2"
    exit 0
fi

# Forward stdin (ref info from git) to vibe-check
exec npx vbc run --remote "\$1" --url "\$2"
`;
}

export async function installHook(): Promise<{
  installed: boolean;
  message: string;
}> {
  const gitDir = getGitDir();
  const hookPath = join(gitDir, "hooks", "pre-push");

  // Check if hook already exists
  try {
    const existing = await readFile(hookPath, "utf-8");
    if (existing.includes(HOOK_MARKER)) {
      return { installed: false, message: "vibe-check hook is already installed." };
    }

    // Another hook exists — append
    const combined = existing.trimEnd() + "\n\n" + generateHookScript();
    await writeFile(hookPath, combined);
    await chmod(hookPath, 0o755);
    return {
      installed: true,
      message: "vibe-check hook appended to existing pre-push hook.",
    };
  } catch {
    // No existing hook
  }

  await writeFile(hookPath, generateHookScript());
  await chmod(hookPath, 0o755);
  return { installed: true, message: "vibe-check pre-push hook installed." };
}

export async function uninstallHook(): Promise<{
  removed: boolean;
  message: string;
}> {
  const gitDir = getGitDir();
  const hookPath = join(gitDir, "hooks", "pre-push");

  try {
    const existing = await readFile(hookPath, "utf-8");
    if (!existing.includes(HOOK_MARKER)) {
      return {
        removed: false,
        message: "No vibe-check hook found in pre-push.",
      };
    }

    // Remove the vibe-check section
    const lines = existing.split("\n");
    const startIdx = lines.findIndex((l) => l.includes(HOOK_MARKER));
    if (startIdx === -1) {
      return { removed: false, message: "No vibe-check hook found." };
    }

    // Remove from marker to the end (or to next hook section)
    const remaining = lines.slice(0, startIdx).join("\n").trim();
    if (!remaining || remaining === "#!/bin/sh") {
      // Nothing left — delete the whole thing by writing empty
      const { unlink } = await import("node:fs/promises");
      await unlink(hookPath);
    } else {
      await writeFile(hookPath, remaining + "\n");
    }

    return { removed: true, message: "vibe-check hook removed." };
  } catch {
    return {
      removed: false,
      message: "No pre-push hook found.",
    };
  }
}

export async function isHookInstalled(): Promise<boolean> {
  try {
    const gitDir = getGitDir();
    const hookPath = join(gitDir, "hooks", "pre-push");
    const content = await readFile(hookPath, "utf-8");
    return content.includes(HOOK_MARKER);
  } catch {
    return false;
  }
}
