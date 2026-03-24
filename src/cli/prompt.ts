import { createReadStream, openSync, closeSync } from "node:fs";
import { createInterface, type Interface } from "node:readline";
import type { Question } from "../ai/types.js";

function openTTY(): Interface {
  const ttyPath = process.platform === "win32" ? "CON" : "/dev/tty";
  const input = createReadStream(ttyPath);
  return createInterface({ input, output: process.stderr });
}

function write(text: string): void {
  process.stderr.write(text);
}

function writeln(text: string): void {
  process.stderr.write(text + "\n");
}

export function isTTYAvailable(): boolean {
  try {
    const ttyPath = process.platform === "win32" ? "CON" : "/dev/tty";
    const fd = openSync(ttyPath, "r");
    closeSync(fd);
    return true;
  } catch {
    return false;
  }
}

export function isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.CONTINUOUS_INTEGRATION ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.JENKINS_URL ||
    process.env.BUILDKITE
  );
}

export async function askQuestion(
  rl: Interface,
  prompt: string,
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

export interface QuizResult {
  questionId: string;
  answer: string;
}

export async function runQuiz(
  questions: Question[],
): Promise<QuizResult[]> {
  const rl = openTTY();
  const results: QuizResult[] = [];

  try {
    writeln("");
    writeln("  (type 'q' or 'exit' at any prompt to abort the push)");
    writeln("");
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      writeln(`Q${i + 1}: ${q.text}`);
      if (q.context) {
        writeln(`   (${q.file}:${q.lineRange})`);
      }
      const answer = await askQuestion(rl, "> ");
      if (answer === "q" || answer === "exit") {
        writeln("\n[vibe-check] Aborted. Push blocked.");
        process.exit(1);
      }
      results.push({ questionId: q.id, answer });
      writeln("");
    }
  } finally {
    rl.close();
  }

  return results;
}

export async function askRetry(): Promise<boolean> {
  const rl = openTTY();
  try {
    const answer = await askQuestion(
      rl,
      "Would you like to retry the failed questions? (y/n) ",
    );
    return answer.toLowerCase().startsWith("y");
  } finally {
    rl.close();
  }
}
