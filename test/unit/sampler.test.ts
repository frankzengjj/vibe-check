import { describe, it, expect } from "vitest";
import { sampleDiff } from "../../src/diff/sampler.js";
import type { ParsedDiff, DiffFile } from "../../src/diff/parser.js";

function makeFile(path: string, linesChanged: number): DiffFile {
  const lines = Array.from({ length: linesChanged }, (_, i) => `+line ${i}`);
  return {
    path,
    hunks: [{ header: "@@ -1,1 +1,1 @@", lines, startLine: 1 }],
    isBinary: false,
    linesChanged,
  };
}

describe("sampleDiff", () => {
  it("returns small diffs as-is", () => {
    const diff: ParsedDiff = {
      files: [makeFile("a.ts", 100)],
      totalLinesChanged: 100,
    };
    const result = sampleDiff(diff);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe("a.ts");
  });

  it("limits large diffs to max 5 files", () => {
    const files = Array.from({ length: 20 }, (_, i) =>
      makeFile(`file${i}.ts`, 200),
    );
    const diff: ParsedDiff = { files, totalLinesChanged: 4000 };
    const result = sampleDiff(diff);
    expect(result.files.length).toBeLessThanOrEqual(5);
  });

  it("prioritizes non-test files in large diffs", () => {
    const files = [
      makeFile("src/app.ts", 100),
      makeFile("src/app.test.ts", 300),
      makeFile("src/lib.ts", 100),
      makeFile("src/lib.spec.ts", 300),
      makeFile("src/index.ts", 50),
      makeFile("src/other.test.ts", 300),
      makeFile("src/core.ts", 80),
    ];
    const diff: ParsedDiff = { files, totalLinesChanged: 3000 };
    const result = sampleDiff(diff);

    // Source files should appear before test files
    const sourcePaths = result.files
      .filter((f) => !f.path.includes("test") && !f.path.includes("spec"))
      .map((f) => f.path);
    expect(sourcePaths.length).toBeGreaterThan(0);
  });
});
