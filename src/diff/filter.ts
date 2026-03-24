import type { DiffFile } from "./parser.js";

const DEFAULT_EXCLUDE_PATTERNS = [
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /\.min\.(js|css)$/,
  /\.map$/,
  /\.lock$/,
  /\.generated\./,
  /\.snap$/,
  /vendor\//,
  /node_modules\//,
];

function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(escaped + "$");
}

export function filterFiles(
  files: DiffFile[],
  excludeGlobs: string[] = [],
): DiffFile[] {
  const customPatterns = excludeGlobs.map(globToRegex);
  const allPatterns = [...DEFAULT_EXCLUDE_PATTERNS, ...customPatterns];

  return files.filter((file) => {
    if (file.isBinary) return false;
    return !allPatterns.some((pattern) => pattern.test(file.path));
  });
}
