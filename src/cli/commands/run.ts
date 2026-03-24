import chalk from "chalk";
import { loadConfig } from "../../config/loader.js";
import { AIClient } from "../../ai/client.js";
import { buildGeneratePrompt } from "../../ai/prompts/generate.js";
import { buildEvaluatePrompt } from "../../ai/prompts/evaluate.js";
import { parsePushRefs } from "../../git/stdin.js";
import { extractDiff } from "../../git/diff.js";
import { parseDiff } from "../../diff/parser.js";
import { filterFiles } from "../../diff/filter.js";
import { sampleDiff } from "../../diff/sampler.js";
import { logBypass } from "../../log/bypass.js";
import { isTTYAvailable, isCI, runQuiz, askRetry } from "../prompt.js";
import type { Question, Evaluation } from "../../ai/types.js";

function diffToString(files: { path: string; hunks: { header: string; lines: string[] }[] }[]): string {
  return files
    .map(
      (f) =>
        `--- a/${f.path}\n+++ b/${f.path}\n` +
        f.hunks.map((h) => h.header + "\n" + h.lines.join("\n")).join("\n"),
    )
    .join("\n\n");
}

function write(text: string): void {
  process.stderr.write(text + "\n");
}

function extractJSON(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  return text.trim();
}

async function generateQuestions(
  client: AIClient,
  diffText: string,
  count: number,
): Promise<Question[]> {
  const messages = buildGeneratePrompt(diffText, count);
  const response = await client.chat(messages);

  try {
    const parsed = JSON.parse(extractJSON(response));
    return parsed.questions || [];
  } catch {
    // If JSON parsing fails, retry once with a nudge
    const retryMessages = [
      ...messages,
      { role: "assistant" as const, content: response },
      {
        role: "user" as const,
        content: "Please respond with raw JSON only (no markdown, no code fences), in the exact format specified.",
      },
    ];
    const retryResponse = await client.chat(retryMessages);
    const parsed = JSON.parse(extractJSON(retryResponse));
    return parsed.questions || [];
  }
}

async function evaluateAnswer(
  client: AIClient,
  question: Question,
  answer: string,
): Promise<Evaluation> {
  const messages = buildEvaluatePrompt(question, answer);
  const response = await client.chat(messages);

  try {
    const parsed = JSON.parse(extractJSON(response));
    return {
      questionId: question.id,
      passed: !!parsed.passed,
      feedback: parsed.feedback || "",
    };
  } catch {
    return {
      questionId: question.id,
      passed: false,
      feedback: "Failed to evaluate answer. Please try again.",
    };
  }
}

export async function runCommand(options: {
  remote?: string;
  url?: string;
  skip?: boolean;
}): Promise<void> {
  const config = await loadConfig();

  // Handle bypass
  if (options.skip) {
    await logBypass(options.remote || "", options.url || "");
    write(chalk.yellow("[vibe-check] Bypass logged."));
    process.exit(0);
  }

  // Skip in CI or non-interactive environments
  if (config.skipInCI && isCI()) {
    write(chalk.dim("[vibe-check] CI detected, skipping."));
    process.exit(0);
  }

  if (!isTTYAvailable()) {
    write(chalk.dim("[vibe-check] No TTY available, skipping."));
    process.exit(0);
  }

  // Validate AI config
  if (!config.ai.apiKey) {
    write(
      chalk.red(
        "[vibe-check] No API key configured. Run `vibe-check init` or set VIBE_CHECK_API_KEY.",
      ),
    );
    process.exit(1);
  }

  // Read push refs from stdin
  let stdinData = "";
  try {
    stdinData = await new Promise<string>((resolve) => {
      let data = "";
      process.stdin.setEncoding("utf-8");
      process.stdin.on("data", (chunk) => (data += chunk));
      process.stdin.on("end", () => resolve(data));
      // Timeout after 1s if no stdin (e.g., manual invocation)
      setTimeout(() => resolve(data), 1000);
    });
  } catch {
    // stdin might not be available
  }

  const refs = parsePushRefs(stdinData);
  if (refs.length === 0) {
    write(chalk.dim("[vibe-check] No refs to check."));
    process.exit(0);
  }

  // Extract and process diff
  write(chalk.bold("\n🔍 vibe-check: Analyzing your diff...\n"));

  const rawDiff = extractDiff(refs[0]);
  if (!rawDiff || rawDiff.trim().length === 0) {
    write(chalk.dim("[vibe-check] No diff found, proceeding."));
    process.exit(0);
  }

  const parsed = parseDiff(rawDiff);
  const filtered = filterFiles(parsed.files, config.excludeFiles);

  if (filtered.length === 0) {
    write(chalk.dim("[vibe-check] Only excluded files changed, proceeding."));
    process.exit(0);
  }

  const sampled = sampleDiff({ files: filtered, totalLinesChanged: parsed.totalLinesChanged });
  const diffText = diffToString(sampled.files);

  // Generate questions
  const client = new AIClient(config.ai);
  let questions: Question[];

  try {
    questions = await generateQuestions(client, diffText, config.questionCount);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    write(chalk.red(`[vibe-check] Failed to generate questions: ${msg}`));
    write(chalk.yellow("Proceeding with push."));
    process.exit(0);
  }

  if (questions.length === 0) {
    write(chalk.dim("[vibe-check] No questions generated, proceeding."));
    process.exit(0);
  }

  // Quiz loop
  let passedCount = 0;
  let failedQuestions: { question: Question; feedback: string }[] = [];
  let attempt = 0;
  let currentQuestions = questions;

  while (attempt <= config.maxRetries) {
    const results = await runQuiz(currentQuestions);

    // Evaluate each answer
    const newFailed: { question: Question; feedback: string }[] = [];

    for (const result of results) {
      const question = currentQuestions.find((q) => q.id === result.questionId);
      if (!question) continue;

      write(chalk.dim("  Evaluating..."));

      const evaluation = await evaluateAnswer(client, question, result.answer);

      if (evaluation.passed) {
        passedCount++;
        write(chalk.green(`  ✅ Correct. ${evaluation.feedback}`));
      } else {
        write(chalk.red(`  ❌ ${evaluation.feedback}`));
        newFailed.push({ question, feedback: evaluation.feedback });
      }
      write("");
    }

    failedQuestions = newFailed;

    if (passedCount >= config.passThreshold) {
      break;
    }

    if (attempt < config.maxRetries && failedQuestions.length > 0) {
      write(
        chalk.yellow(
          `\nScore: ${passedCount}/${config.passThreshold} needed. ${failedQuestions.length} question(s) failed.`,
        ),
      );
      const retry = await askRetry();
      if (!retry) break;
      currentQuestions = failedQuestions.map((f) => f.question);
      attempt++;
    } else {
      break;
    }
  }

  // Final verdict
  write("");
  if (passedCount >= config.passThreshold) {
    write(chalk.green.bold(`✅ vibe-check passed (${passedCount}/${questions.length}).`));
    write(chalk.green("🚀 Push approved.\n"));
    process.exit(0);
  } else {
    write(
      chalk.red.bold(
        `❌ vibe-check failed (${passedCount}/${config.passThreshold} needed).`,
      ),
    );
    write(chalk.red("Push blocked. Review the code and try again.\n"));
    write(
      chalk.dim(
        "Tip: Use VIBE_CHECK_SKIP=1 git push to bypass (will be logged). Or run `vbc uninstall` to remove the hook.",
      ),
    );
    process.exit(1);
  }
}
