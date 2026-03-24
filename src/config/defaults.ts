import type { VibeCheckConfig } from "./schema.js";

export const DEFAULT_CONFIG: VibeCheckConfig = {
  ai: {
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "gpt-4o",
  },
  questionCount: 3,
  passThreshold: 2,
  maxRetries: 1,
  excludeFiles: [
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "*.min.js",
    "*.min.css",
    "*.map",
    "*.lock",
  ],
  skipInCI: true,
  diffMaxLines: 2000,
};
