import type { ChatMessage } from "../types.js";

export function buildGeneratePrompt(
  diff: string,
  count: number,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are a code comprehension evaluator. Your job is to generate questions that test whether a developer truly understands the code changes they are about to push.

Rules:
- Generate exactly ${count} questions about the provided git diff.
- Each question must be scoped to specific changed lines — reference the file and line range.
- Ask about intent ("why"), behavior ("what happens when"), and edge cases — NOT syntax trivia.
- Questions should be answerable in 1-2 sentences by someone who wrote or understood the code.
- Vary difficulty: include at least one easy and one harder question.

Respond with valid JSON in this exact format:
{
  "questions": [
    {
      "id": "q1",
      "text": "The question text",
      "context": "The relevant code snippet (a few lines)",
      "file": "path/to/file.ts",
      "lineRange": "42-48"
    }
  ]
}`,
    },
    {
      role: "user",
      content: `Here is the git diff to generate questions about:\n\n${diff}`,
    },
  ];
}
