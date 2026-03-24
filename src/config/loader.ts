import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
import { partialConfigSchema, type VibeCheckConfig } from "./schema.js";
import { DEFAULT_CONFIG } from "./defaults.js";

const PROJECT_CONFIG_NAME = ".vibecheck.json";
const USER_CONFIG_DIR = join(homedir(), ".vibe-check");
const USER_CONFIG_PATH = join(USER_CONFIG_DIR, "config.json");

async function readJsonFile(path: string): Promise<unknown | null> {
  try {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function findProjectRoot(startDir: string): string | null {
  let dir = resolve(startDir);
  const root = resolve("/");

  while (dir !== root) {
    try {
      // Sync check is fine here — runs once at startup
      const { statSync } = require("node:fs");
      if (statSync(join(dir, ".git")).isDirectory()) return dir;
    } catch {
      // not found, keep looking
    }
    dir = resolve(dir, "..");
  }
  return null;
}

function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    const val = override[key];
    if (
      val !== undefined &&
      val !== null &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        val as Record<string, unknown>,
      );
    } else if (val !== undefined) {
      result[key] = val;
    }
  }
  return result;
}

export async function loadConfig(
  cwd: string = process.cwd(),
): Promise<VibeCheckConfig> {
  let merged: Record<string, unknown> = {
    ...DEFAULT_CONFIG,
    ai: { ...DEFAULT_CONFIG.ai },
  };

  // Layer 1: User-level config
  const userConfig = await readJsonFile(USER_CONFIG_PATH);
  if (userConfig && typeof userConfig === "object") {
    const parsed = partialConfigSchema.safeParse(userConfig);
    if (parsed.success && parsed.data) {
      merged = deepMerge(merged, parsed.data as Record<string, unknown>);
    }
  }

  // Layer 2: Project-level config
  const projectRoot = findProjectRoot(cwd);
  if (projectRoot) {
    const projectConfig = await readJsonFile(
      join(projectRoot, PROJECT_CONFIG_NAME),
    );
    if (projectConfig && typeof projectConfig === "object") {
      const parsed = partialConfigSchema.safeParse(projectConfig);
      if (parsed.success && parsed.data) {
        merged = deepMerge(merged, parsed.data as Record<string, unknown>);
      }
    }
  }

  // Layer 3: Environment variables
  if (process.env.VIBE_CHECK_API_KEY) {
    (merged.ai as Record<string, unknown>).apiKey =
      process.env.VIBE_CHECK_API_KEY;
  }
  if (process.env.VIBE_CHECK_BASE_URL) {
    (merged.ai as Record<string, unknown>).baseUrl =
      process.env.VIBE_CHECK_BASE_URL;
  }
  if (process.env.VIBE_CHECK_MODEL) {
    (merged.ai as Record<string, unknown>).model = process.env.VIBE_CHECK_MODEL;
  }

  return merged as VibeCheckConfig;
}

export { USER_CONFIG_DIR, USER_CONFIG_PATH, PROJECT_CONFIG_NAME };
