import { NextResponse } from "next/server";
import { advanceInterview } from "@/lib/interview/state-machine";
import { OPENING_TEXT } from "@/lib/interview/stages";
import { isDemoMode } from "@/lib/llm/client";
import { addMessage, getOrCreateSession, listMessages, updateSession } from "@/lib/db/queries";
import { createInitialSession, decodeSession, encodeSession } from "@/lib/utils/session";

interface ChatRequestBody {
  sessionId?: string;
  message?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const userMessage = body.message?.trim() ?? "";
    const incomingToken = body.sessionId?.trim() || "";

    // 优先从 sessionId 解码出状态（无状态模式，兼容 Vercel serverless 冷启动）
    let session = incomingToken ? decodeSession(incomingToken) : null;
    if (!session) {
      session = createInitialSession(isDemoMode());
    }

    // 同时维护内存存储（用于消息历史），但状态以 sessionId 中的为准
    // 这里把解码出的 session 同步到内存存储
    const stored = await getOrCreateSession(session.id);
    // 用解码的 session 覆盖内存里的 stage 等元数据
    Object.assign(stored, {
      stage: session.stage,
      finalQuote: session.finalQuote,
      quoteConfirmed: session.quoteConfirmed,
      followupCount: session.followupCount,
      evidenceCount: session.evidenceCount,
      referenceStep: session.referenceStep
    });

    if (!userMessage) {
      const empty = {
        ...session,
        updatedAt: new Date().toISOString()
      };
      return NextResponse.json({
        sessionId: encodeSession(empty),
        stage: empty.stage,
        reply: OPENING_TEXT,
        requiresConfirmation: false,
        quoteCandidate: null,
        ended: false
      });
    }

    await addMessage(session.id, "user", userMessage, session.stage);
    const messages = await listMessages(session.id);
    const { session: nextSession, chat } = await advanceInterview({
      session,
      messages,
      userMessage
    });

    await updateSession(nextSession);
    await addMessage(session.id, "assistant", chat.reply, nextSession.stage);

    return NextResponse.json({
      ...chat,
      sessionId: encodeSession(nextSession)
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "chat_failed",
        reply: "我这边停一下。咱先说你手里这件事。"
      },
      { status: 500 }
    );
  }
}
