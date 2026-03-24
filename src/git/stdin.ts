export interface PushRef {
  localRef: string;
  localSha: string;
  remoteRef: string;
  remoteSha: string;
}

const ZERO_SHA = "0000000000000000000000000000000000000000";

export function parsePushRefs(input: string): PushRef[] {
  const refs: PushRef[] = [];

  for (const line of input.trim().split("\n")) {
    if (!line.trim()) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 4) {
      refs.push({
        localRef: parts[0],
        localSha: parts[1],
        remoteRef: parts[2],
        remoteSha: parts[3],
      });
    }
  }

  return refs;
}

export function isDeletePush(ref: PushRef): boolean {
  return ref.localSha === ZERO_SHA;
}

export function isNewBranch(ref: PushRef): boolean {
  return ref.remoteSha === ZERO_SHA;
}

export function getDiffRange(ref: PushRef): string | null {
  if (isDeletePush(ref)) return null;
  if (isNewBranch(ref)) return ref.localSha;
  return `${ref.remoteSha}..${ref.localSha}`;
}
