export type InterviewStage =
  | "opening"
  | "story"
  | "keyword_followup"
  | "external_evidence"
  | "reference_shift"
  | "quote_confirm"
  | "mirror_back"
  | "end";

export interface InterviewSession {
  id: string;
  stage: InterviewStage;
  finalQuote: string | null;
  quoteConfirmed: boolean;
  demoMode: boolean;
  followupCount: number;
  evidenceCount: number;
  referenceStep: 0 | 1 | 2 | 3;
  createdAt: string;
  updatedAt: string;
}

export interface ChatResponse {
  sessionId: string;
  stage: InterviewStage;
  reply: string;
  requiresConfirmation: boolean;
  quoteCandidate: string | null;
  ended: boolean;
}
