import type { InterviewStage } from "./interview";

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  stage: InterviewStage;
  createdAt: string;
}

export interface UiMessage {
  id: string;
  role: MessageRole;
  content: string;
  requiresConfirmation?: boolean;
  quoteCandidate?: string | null;
}
