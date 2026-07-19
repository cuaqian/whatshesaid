import type { ChatResponse, InterviewSession } from "@/types/interview";
import type { ChatMessage } from "@/types/message";
import { createLlmClient, isDemoMode } from "@/lib/llm/client";
import { buildKeywordFollowupPrompt, buildQuoteSelectionPrompt, SYSTEM_GUARDRAIL_PROMPT } from "./prompts";
import { isAffirmative, isNegative, isPoliteAgreement, sanitizeAssistantReply } from "./guardrails";
import { isExactUserQuote, pickQuoteCandidate } from "./quote";
import {
  END_TEXT,
  EXTERNAL_EVIDENCE_FALLBACK,
  EXTERNAL_EVIDENCE_PROMPT,
  MIRROR_BACK_TEXT,
  MIRROR_BACK_WITH_METAPHOR,
  OPENING_TEXT,
  REFERENCE_OUTSIDER_PROMPT,
  REFERENCE_PEER_PROMPT,
  REFERENCE_SHIFT_LINE,
  STORY_PROMPT
} from "./stages";

export interface AdvanceInterviewInput {
  session: InterviewSession;
  messages: ChatMessage[];
  userMessage: string;
}

function response(session: InterviewSession, reply: string, options: Partial<ChatResponse> = {}): ChatResponse {
  return {
    sessionId: session.id,
    stage: session.stage,
    reply,
    requiresConfirmation: false,
    quoteCandidate: null,
    ended: false,
    ...options
  };
}

function extractKeyword(text: string): string {
  const cleaned = text.replace(/[，。！？!?、,.]/gu, " ");
  const words = cleaned.split(/\s+/u).filter((word) => word.length >= 2 && word.length <= 8);
  const preferred = words.find((word) => /做|弄|看|说|问|拿|给|找|改|算|记|查|带|安排|处理|协调|收|发|跑|顶|接|管/u.test(word));
  return preferred ?? words[0] ?? "这件事";
}

async function makeKeywordQuestion(messages: ChatMessage[], keyword: string): Promise<string> {
  const fallback = `你刚才说的『${keyword}』，具体咋弄的？`;

  if (isDemoMode()) {
    return fallback;
  }

  try {
    const llm = createLlmClient();
    const reply = await llm.generate(
      [
        { role: "system", content: SYSTEM_GUARDRAIL_PROMPT },
        { role: "user", content: buildKeywordFollowupPrompt(messages, keyword) }
      ],
      { temperature: 0.2, maxTokens: 80 }
    );
    return sanitizeAssistantReply(reply, fallback);
  } catch {
    return fallback;
  }
}

async function selectQuote(messages: ChatMessage[]): Promise<string> {
  const fallback = pickQuoteCandidate(messages);

  if (isDemoMode()) {
    return fallback;
  }

  try {
    const llm = createLlmClient();
    const quote = await llm.generate(
      [
        { role: "system", content: SYSTEM_GUARDRAIL_PROMPT },
        { role: "user", content: buildQuoteSelectionPrompt(messages) }
      ],
      { temperature: 0, maxTokens: 80 }
    );
    const cleaned = quote.trim().replace(/^['"“”‘’『』]+|['"“”‘’『』]+$/gu, "");
    return isExactUserQuote(cleaned, messages) ? cleaned : fallback;
  } catch {
    return fallback;
  }
}

export async function advanceInterview(input: AdvanceInterviewInput): Promise<{ session: InterviewSession; chat: ChatResponse }> {
  const session: InterviewSession = { ...input.session };
  const messages = input.messages;
  const userMessage = input.userMessage.trim();

  if (session.stage === "end") {
    return { session, chat: response(session, END_TEXT, { ended: true }) };
  }

  if (session.stage === "opening") {
    session.stage = "story";
    return { session, chat: response(session, userMessage ? STORY_PROMPT : OPENING_TEXT) };
  }

  if (session.stage === "story") {
    session.stage = "keyword_followup";
    session.followupCount = 1;
    const keyword = extractKeyword(userMessage);
    const reply = await makeKeywordQuestion(messages, keyword);
    return { session, chat: response(session, reply) };
  }

  if (session.stage === "keyword_followup") {
    if (session.followupCount < 3) {
      session.followupCount += 1;
      const keyword = extractKeyword(userMessage);
      const reply = await makeKeywordQuestion(messages, keyword);
      return { session, chat: response(session, reply) };
    }

    session.stage = "external_evidence";
    return { session, chat: response(session, EXTERNAL_EVIDENCE_PROMPT) };
  }

  if (session.stage === "external_evidence") {
    if (/没有|没|不记得|不知道/u.test(userMessage)) {
      return { session, chat: response(session, EXTERNAL_EVIDENCE_FALLBACK) };
    }

    session.stage = "reference_shift";
    session.referenceStep = 1;
    return { session, chat: response(session, REFERENCE_PEER_PROMPT) };
  }

  if (session.stage === "reference_shift") {
    if (session.referenceStep === 1) {
      session.referenceStep = 2;
      return { session, chat: response(session, REFERENCE_OUTSIDER_PROMPT) };
    }

    const quote = await selectQuote(messages);
    session.stage = "quote_confirm";
    session.finalQuote = quote;
    const reply = `${REFERENCE_SHIFT_LINE}\n\n你前面说了一句话，我想跟你确认一下——你说的是『${quote}』，对吗？`;
    return {
      session,
      chat: response(session, reply, {
        requiresConfirmation: true,
        quoteCandidate: quote
      })
    };
  }

  if (session.stage === "quote_confirm") {
    if (isAffirmative(userMessage)) {
      session.quoteConfirmed = true;
      session.stage = "mirror_back";
      const polite = isPoliteAgreement(userMessage);
      const hasMetaphor = /像|跟.*一样|好比|仿佛|简直/u.test(session.finalQuote ?? "");
      let mirrorText = MIRROR_BACK_TEXT;
      if (hasMetaphor) {
        mirrorText += `\n\n${MIRROR_BACK_WITH_METAPHOR}`;
      }
      // 如果只是礼貌敷衍，不再追加强调，平静还回去
      return { session, chat: response(session, mirrorText) };
    }

    if (isNegative(userMessage)) {
      const quote = pickQuoteCandidate(messages, session.finalQuote ? [session.finalQuote] : []);
      session.finalQuote = quote;
      return {
        session,
        chat: response(session, `那我重新确认——你说的是『${quote}』，对吗？`, {
          requiresConfirmation: true,
          quoteCandidate: quote
        })
      };
    }

    return {
      session,
      chat: response(session, `我只确认这句原话。你说的是『${session.finalQuote ?? ""}』，对吗？`, {
        requiresConfirmation: true,
        quoteCandidate: session.finalQuote
      })
    };
  }

  if (session.stage === "mirror_back") {
    session.stage = "end";
    return { session, chat: response(session, END_TEXT, { ended: true }) };
  }

  session.stage = "end";
  return { session, chat: response(session, END_TEXT, { ended: true }) };
}
