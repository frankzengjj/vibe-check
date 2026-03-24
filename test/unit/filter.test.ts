import { describe, it, expect } from "vitest";
import { filterFiles } from "../../src/diff/filter.js";
import type { DiffFile } from "../../src/diff/parser.js";

function makeFile(path: string, isBinary = false): DiffFile {
  return { path, hunks: [], isBinary, linesChanged: 10 };
}

describe("filterFiles", () => {
  it("excludes binary files", () => {
    const files = [makeFile("src/app.ts"), makeFile("image.png", true)];
    const result = filterFiles(files);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/app.ts");
  });

  it("excludes lock files by default", () => {
    const files = [
      makeFile("src/app.ts"),
      makeFile("package-lock.json"),
      makeFile("yarn.lock"),
      makeFile("pnpm-lock.yaml"),
    ];
    const result = filterFiles(files);
    expect(result).toHaveLength(1);
  });

  it("excludes minified files by default", () => {
    const files = [makeFile("src/app.ts"), makeFile("dist/bundle.min.js")];
    const result = filterFiles(files);
    expect(result).toHaveLength(1);
  });

  it("applies custom exclude globs", () => {
    const files = [makeFile("src/app.ts"), makeFile("src/generated/api.ts")];
    const result = filterFiles(files, ["src/generated/*"]);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/app.ts");
  });

  it("keeps all files when no exclusions match", () => {
    const files = [makeFile("src/app.ts"), makeFile("src/lib.ts")];
    const result = filterFiles(files);
    expect(result).toHaveLength(2);
  });
});
