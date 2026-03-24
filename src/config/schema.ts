import { z } from "zod/v4";

export const vibeCheckConfigSchema = z.object({
  ai: z.object({
    baseUrl: z.url().describe("OpenAI-compatible API base URL"),
    apiKey: z.string().describe("API key for the AI provider"),
    model: z.string().describe("Model identifier (e.g. gpt-4o, llama3)"),
  }),
  questionCount: z.number().int().min(1).max(10).default(3),
  passThreshold: z.number().int().min(1).default(2),
  maxRetries: z.number().int().min(0).max(5).default(1),
  excludeFiles: z.array(z.string()).default([]),
  skipInCI: z.boolean().default(true),
  diffMaxLines: z.number().int().min(100).default(2000),
});

export type VibeCheckConfig = z.infer<typeof vibeCheckConfigSchema>;

export const partialConfigSchema = vibeCheckConfigSchema.partial();
export type PartialConfig = z.infer<typeof partialConfigSchema>;
