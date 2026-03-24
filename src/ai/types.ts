export interface Question {
  id: string;
  text: string;
  context: string;
  file: string;
  lineRange: string;
}

export interface Evaluation {
  questionId: string;
  passed: boolean;
  feedback: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}
