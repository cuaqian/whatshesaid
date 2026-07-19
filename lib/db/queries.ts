import type { InterviewSession } from "@/types/interview";
import type { ChatMessage, MessageRole } from "@/types/message";
import { createId } from "@/lib/utils/id";
import { isDemoMode } from "@/lib/llm/client";

interface StoredSession extends InterviewSession {
  messages: ChatMessage[];
}

const sessions = new Map<string, StoredSession>();

function now(): string {
  return new Date().toISOString();
}

export async function getOrCreateSession(sessionId?: string): Promise<StoredSession> {
  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId)!;
  }

  const id = sessionId || createId("session");
  const timestamp = now();
  const session: StoredSession = {
    id,
    stage: "opening",
    finalQuote: null,
    quoteConfirmed: false,
    demoMode: isDemoMode(),
    followupCount: 0,
    evidenceCount: 0,
    referenceStep: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: []
  };

  sessions.set(id, session);
  return session;
}

export async function addMessage(sessionId: string, role: MessageRole, content: string, stage: InterviewSession["stage"]): Promise<ChatMessage> {
  const session = await getOrCreateSession(sessionId);
  const message: ChatMessage = {
    id: createId("msg"),
    sessionId,
    role,
    content,
    stage,
    createdAt: now()
  };
  session.messages.push(message);
  session.updatedAt = now();
  sessions.set(sessionId, session);
  return message;
}

export async function updateSession(session: InterviewSession): Promise<void> {
  const stored = await getOrCreateSession(session.id);
  sessions.set(session.id, {
    ...stored,
    ...session,
    updatedAt: now()
  });
}

export async function listMessages(sessionId: string): Promise<ChatMessage[]> {
  const session = await getOrCreateSession(sessionId);
  return session.messages;
}
