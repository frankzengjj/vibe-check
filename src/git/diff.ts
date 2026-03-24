import { execSync } from "node:child_process";
import type { PushRef } from "./stdin.js";
import { getDiffRange, isNewBranch } from "./stdin.js";

export function extractDiff(ref: PushRef): string | null {
  const range = getDiffRange(ref);
  if (!range) return null;

  try {
    if (isNewBranch(ref)) {
      // For new branches, diff against the merge-base with HEAD
      // This shows only the commits unique to this branch
      const mergeBase = execSync(
        `git merge-base HEAD~10 ${ref.localSha} 2>/dev/null || echo ${ref.localSha}~1`,
        { encoding: "utf-8" },
      ).trim();
      return execSync(`git diff ${mergeBase}..${ref.localSha}`, {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
      });
    }

    return execSync(`git diff ${range}`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}
