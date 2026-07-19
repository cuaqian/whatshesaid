import { NextResponse } from "next/server";
import { advanceInterview } from "@/lib/interview/state-machine";
import { OPENING_TEXT } from "@/lib/interview/stages";
import { addMessage, getOrCreateSession, listMessages, updateSession } from "@/lib/db/queries";

interface ChatRequestBody {
  sessionId?: string;
  message?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const userMessage = body.message?.trim() ?? "";
    const session = await getOrCreateSession(body.sessionId);

    if (!userMessage) {
      return NextResponse.json({
        sessionId: session.id,
        stage: session.stage,
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

    return NextResponse.json(chat);
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
