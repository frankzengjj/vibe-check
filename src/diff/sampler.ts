import type { DiffFile, ParsedDiff } from "./parser.js";

const SMALL_DIFF_THRESHOLD = 500;
const MEDIUM_DIFF_THRESHOLD = 2000;
const MAX_SAMPLED_FILES = 5;
const MAX_LINES_PER_FILE = 200;

// Heuristic: test files and config files are less interesting
const LOW_PRIORITY_PATTERNS = [
  /\.(test|spec|e2e)\.(ts|js|tsx|jsx)$/,
  /__(tests|mocks|snapshots)__\//,
  /\.config\.(ts|js|json)$/,
  /\.env/,
  /\.eslintrc/,
  /\.prettierrc/,
  /tsconfig.*\.json$/,
];

function priorityScore(file: DiffFile): number {
  const isLowPriority = LOW_PRIORITY_PATTERNS.some((p) => p.test(file.path));
  return isLowPriority ? file.linesChanged : file.linesChanged * 3;
}

function truncateHunks(file: DiffFile, maxLines: number): DiffFile {
  const truncatedHunks = [];
  let lineCount = 0;

  for (const hunk of file.hunks) {
    if (lineCount >= maxLines) break;
    const remainingLines = maxLines - lineCount;
    const truncatedLines = hunk.lines.slice(0, remainingLines);
    truncatedHunks.push({ ...hunk, lines: truncatedLines });
    lineCount += truncatedLines.length;
  }

  return {
    ...file,
    hunks: truncatedHunks,
    linesChanged: Math.min(file.linesChanged, maxLines),
  };
}

export function sampleDiff(diff: ParsedDiff): ParsedDiff {
  const { files, totalLinesChanged } = diff;

  // Small diff: return as-is
  if (totalLinesChanged <= SMALL_DIFF_THRESHOLD) {
    return diff;
  }

  // Medium diff: strip context, keep all files
  if (totalLinesChanged <= MEDIUM_DIFF_THRESHOLD) {
    return {
      files: files.map((f) => ({
        ...f,
        hunks: f.hunks.map((h) => ({
          ...h,
          // Keep only changed lines and 3 lines of context
          lines: h.lines.filter(
            (l, i, arr) =>
              l.startsWith("+") ||
              l.startsWith("-") ||
              (i > 0 && (arr[i - 1].startsWith("+") || arr[i - 1].startsWith("-"))) ||
              (i < arr.length - 1 &&
                (arr[i + 1].startsWith("+") || arr[i + 1].startsWith("-"))),
          ),
        })),
      })),
      totalLinesChanged,
    };
  }

  // Large diff: sample top files by priority
  const sorted = [...files].sort((a, b) => priorityScore(b) - priorityScore(a));
  const sampled = sorted.slice(0, MAX_SAMPLED_FILES).map((f) => truncateHunks(f, MAX_LINES_PER_FILE));

  return {
    files: sampled,
    totalLinesChanged: sampled.reduce((sum, f) => sum + f.linesChanged, 0),
  };
}
