import type { ChatMessage, Question } from "../types.js";

export function buildEvaluatePrompt(
  question: Question,
  answer: string,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are a code comprehension evaluator. A developer was asked a question about code they are pushing. Judge whether their answer demonstrates genuine understanding.

Rules:
- Be generous with terminology — different wording is fine if the concept is correct.
- Focus on whether the developer understands the WHY and WHAT, not exact phrasing.
- A partial but correct answer should pass if it shows understanding of the core concept.
- Only fail answers that show a clear misunderstanding or are completely off-topic.

Respond with valid JSON in this exact format:
{
  "passed": true or false,
  "feedback": "Brief explanation of why the answer passed or failed, and what the correct understanding is if failed"
}`,
    },
    {
      role: "user",
      content: `File: ${question.file} (lines ${question.lineRange})

Code context:
${question.context}

Question: ${question.text}

Developer's answer: ${answer}`,
    },
  ];
}
