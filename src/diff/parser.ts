export interface DiffFile {
  path: string;
  hunks: DiffHunk[];
  isBinary: boolean;
  linesChanged: number;
}

export interface DiffHunk {
  header: string;
  lines: string[];
  startLine: number;
}

export interface ParsedDiff {
  files: DiffFile[];
  totalLinesChanged: number;
}

export function parseDiff(rawDiff: string): ParsedDiff {
  const files: DiffFile[] = [];
  const fileSections = rawDiff.split(/^diff --git /m).filter(Boolean);

  for (const section of fileSections) {
    const lines = section.split("\n");

    // Extract file path from the "a/... b/..." header
    const headerMatch = lines[0]?.match(/a\/(.+?) b\/(.+)/);
    if (!headerMatch) continue;

    const filePath = headerMatch[2];

    // Check for binary
    if (section.includes("Binary files")) {
      files.push({
        path: filePath,
        hunks: [],
        isBinary: true,
        linesChanged: 0,
      });
      continue;
    }

    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;
    let linesChanged = 0;

    for (const line of lines) {
      const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunkMatch) {
        if (currentHunk) hunks.push(currentHunk);
        currentHunk = {
          header: line,
          lines: [],
          startLine: parseInt(hunkMatch[1], 10),
        };
        continue;
      }

      if (currentHunk) {
        currentHunk.lines.push(line);
        if (line.startsWith("+") || line.startsWith("-")) {
          linesChanged++;
        }
      }
    }

    if (currentHunk) hunks.push(currentHunk);

    files.push({
      path: filePath,
      hunks,
      isBinary: false,
      linesChanged,
    });
  }

  return {
    files,
    totalLinesChanged: files.reduce((sum, f) => sum + f.linesChanged, 0),
  };
}
