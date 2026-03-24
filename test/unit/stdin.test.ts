import { describe, it, expect } from "vitest";
import {
  parsePushRefs,
  isDeletePush,
  isNewBranch,
  getDiffRange,
} from "../../src/git/stdin.js";

describe("parsePushRefs", () => {
  it("parses standard pre-push stdin format", () => {
    const input =
      "refs/heads/main abc1234567890123456789012345678901234567 refs/heads/main def1234567890123456789012345678901234567\n";
    const refs = parsePushRefs(input);
    expect(refs).toHaveLength(1);
    expect(refs[0].localRef).toBe("refs/heads/main");
    expect(refs[0].localSha).toBe("abc1234567890123456789012345678901234567");
  });

  it("handles empty input", () => {
    expect(parsePushRefs("")).toHaveLength(0);
    expect(parsePushRefs("  \n  ")).toHaveLength(0);
  });

  it("parses multiple refs", () => {
    const input = [
      "refs/heads/main aaa0000000000000000000000000000000000000 refs/heads/main bbb0000000000000000000000000000000000000",
      "refs/heads/dev ccc0000000000000000000000000000000000000 refs/heads/dev ddd0000000000000000000000000000000000000",
    ].join("\n");
    expect(parsePushRefs(input)).toHaveLength(2);
  });
});

describe("isDeletePush", () => {
  it("detects delete push (local sha all zeros)", () => {
    expect(
      isDeletePush({
        localRef: "refs/heads/old",
        localSha: "0000000000000000000000000000000000000000",
        remoteRef: "refs/heads/old",
        remoteSha: "abc1234567890123456789012345678901234567",
      }),
    ).toBe(true);
  });
});

describe("isNewBranch", () => {
  it("detects new branch (remote sha all zeros)", () => {
    expect(
      isNewBranch({
        localRef: "refs/heads/feature",
        localSha: "abc1234567890123456789012345678901234567",
        remoteRef: "refs/heads/feature",
        remoteSha: "0000000000000000000000000000000000000000",
      }),
    ).toBe(true);
  });
});

describe("getDiffRange", () => {
  it("returns range for normal push", () => {
    expect(
      getDiffRange({
        localRef: "refs/heads/main",
        localSha: "abc",
        remoteRef: "refs/heads/main",
        remoteSha: "def",
      }),
    ).toBe("def..abc");
  });

  it("returns null for delete push", () => {
    expect(
      getDiffRange({
        localRef: "refs/heads/old",
        localSha: "0000000000000000000000000000000000000000",
        remoteRef: "refs/heads/old",
        remoteSha: "abc",
      }),
    ).toBeNull();
  });
});
