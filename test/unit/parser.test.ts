import { describe, it, expect } from "vitest";
import { parseDiff } from "../../src/diff/parser.js";

const SAMPLE_DIFF = `diff --git a/src/auth.py b/src/auth.py
index abc1234..def5678 100644
--- a/src/auth.py
+++ b/src/auth.py
@@ -40,6 +40,10 @@ def authenticate(user):
     token = generate_token(user)
-    store_token(token)
+    hashed = hash_token(token)
+    store_token(hashed)
+    log_auth_event(user.id)
     return token

diff --git a/src/utils.py b/src/utils.py
index 1111111..2222222 100644
--- a/src/utils.py
+++ b/src/utils.py
@@ -10,3 +10,7 @@ def helper():
     pass
+
+def new_helper():
+    return True
`;

const BINARY_DIFF = `diff --git a/image.png b/image.png
Binary files a/image.png and b/image.png differ
`;

describe("parseDiff", () => {
  it("parses multiple files from a diff", () => {
    const result = parseDiff(SAMPLE_DIFF);
    expect(result.files).toHaveLength(2);
    expect(result.files[0].path).toBe("src/auth.py");
    expect(result.files[1].path).toBe("src/utils.py");
  });

  it("extracts hunks with correct start lines", () => {
    const result = parseDiff(SAMPLE_DIFF);
    expect(result.files[0].hunks).toHaveLength(1);
    expect(result.files[0].hunks[0].startLine).toBe(40);
  });

  it("counts changed lines", () => {
    const result = parseDiff(SAMPLE_DIFF);
    expect(result.files[0].linesChanged).toBeGreaterThan(0);
    expect(result.totalLinesChanged).toBeGreaterThan(0);
  });

  it("marks binary files", () => {
    const result = parseDiff(BINARY_DIFF);
    expect(result.files[0].isBinary).toBe(true);
    expect(result.files[0].linesChanged).toBe(0);
  });

  it("handles empty diff", () => {
    const result = parseDiff("");
    expect(result.files).toHaveLength(0);
    expect(result.totalLinesChanged).toBe(0);
  });
});
