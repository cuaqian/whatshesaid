// 把 InterviewSession 序列化进 sessionId，让 API 无状态（Vercel serverless 必备）
import type { InterviewSession, InterviewStage } from "@/types/interview";
import { createId } from "./id";

const PREFIX = "wss_";

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + padding, "base64").toString("utf-8");
}

export function encodeSession(session: InterviewSession): string {
  return PREFIX + base64UrlEncode(JSON.stringify(session));
}

export function decodeSession(token: string): InterviewSession | null {
  if (!token || !token.startsWith(PREFIX)) {
    return null;
  }
  try {
    const json = base64UrlDecode(token.slice(PREFIX.length));
    const parsed = JSON.parse(json) as InterviewSession;
    // 简单字段校验
    if (typeof parsed.id !== "string" || typeof parsed.stage !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function createInitialSession(demoMode: boolean): InterviewSession {
  const now = new Date().toISOString();
  return {
    id: createId("session"),
    stage: "opening" as InterviewStage,
    finalQuote: null,
    quoteConfirmed: false,
    demoMode,
    followupCount: 0,
    evidenceCount: 0,
    referenceStep: 0,
    createdAt: now,
    updatedAt: now
  };
}
