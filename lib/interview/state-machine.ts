import type { ChatResponse, InterviewSession } from "@/types/interview";
import type { ChatMessage } from "@/types/message";
import { createLlmClient, isDemoMode } from "@/lib/llm/client";
import { SYSTEM_PROMPT, buildStagePrompt, buildKeywordExtractionPrompt } from "./prompts";
import { isAffirmative, isNegative, isPoliteAgreement, sanitizeAssistantReply, violatesGuardrails } from "./guardrails";
import { isExactUserQuote, pickQuoteCandidate } from "./quote";
import {
  END_TEXT,
  MIRROR_BACK_TEXT,
  MIRROR_BACK_WITH_METAPHOR,
  OPENING_TEXT,
  REFERENCE_SHIFT_LINE
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

async function callLlmWithFallback(prompt: string, fallback: string, maxTokens = 120): Promise<string> {
  if (isDemoMode()) {
    return fallback;
  }
  try {
    const llm = createLlmClient();
    const reply = await llm.generate([{ role: "system", content: prompt }], { temperature: 0.3, maxTokens });
    const text = sanitizeAssistantReply(reply, fallback);
    if (violatesGuardrails(text)) {
      return fallback;
    }
    return text;
  } catch {
    return fallback;
  }
}

async function extractKeyword(text: string): Promise<string> {
  if (isDemoMode()) {
    // Fallback: simple extraction
    const cleaned = text.replace(/[，。！？!?、,.]/gu, " ");
    const words = cleaned.split(/\s+/u).filter((word) => word.length >= 2 && word.length <= 8);
    const actionHints = ["做", "弄", "看", "说", "问", "拿", "给", "找", "改", "算", "记", "查", "带", "安排", "处理", "协调", "收", "发", "跑", "顶", "接", "管"];
    return words.find((word) => actionHints.some((hint) => word.includes(hint))) ?? words[0] ?? "这件事";
  }
  try {
    const llm = createLlmClient();
    const keyword = await llm.generate(
      [{ role: "system", content: buildKeywordExtractionPrompt(text) }],
      { temperature: 0, maxTokens: 20 }
    );
    return keyword.trim() || "这件事";
  } catch {
    return "这件事";
  }
}

async function selectQuoteWithContext(messages: ChatMessage[]): Promise<string> {
  const userMessages = messages.filter((message) => message.role === "user");
  const userLines = userMessages.map((message) => message.content);
  const allText = userLines.join("\n");

  if (isDemoMode()) {
    return pickQuoteCandidate(messages);
  }

  try {
    const quotePrompt = `${SYSTEM_PROMPT}

从她说过的话里选一句最适合还给她的原话。
要求：只能返回她原文中的连续片段，不能改一个字，不能润色，不能加标点。
选那句最具体、有动作、有现场感、她脱口而出却轻轻带过的。

她说的所有话：
${userLines.map((line) => `- ${line}`).join("\n")}

只输出选中的原话片段，不要解释。`;

    const llm = createLlmClient();
    const quote = await llm.generate([{ role: "system", content: quotePrompt }], { temperature: 0, maxTokens: 80 });
    const cleaned = quote.trim().replace(/^['"「『]+|['"」』]+$/gu, "");
    return isExactUserQuote(cleaned, messages) ? cleaned : pickQuoteCandidate(messages);
  } catch {
    return pickQuoteCandidate(messages);
  }
}

export async function advanceInterview(input: AdvanceInterviewInput): Promise<{ session: InterviewSession; chat: ChatResponse }> {
  const session: InterviewSession = { ...input.session };
  const messages = input.messages;
  const userMessage = input.userMessage.trim();
  const allUserMessages = messages.filter((message) => message.role === "user").map((message) => message.content);

  if (session.stage === "end") {
    return { session, chat: response(session, END_TEXT, { ended: true }) };
  }

  // opening: 固定开场
  if (session.stage === "opening") {
    session.stage = "story";
    if (!userMessage) {
      return { session, chat: response(session, OPENING_TEXT) };
    }
    // 用户回应了"可以吗"，模型生成 story 阶段的问题
    const fallback = "你做过的事里，印象最深的是哪一段？带我回那一天——几点开始、什么环境、跟谁一起、先干啥？";
    const reply = await callLlmWithFallback(
      buildStagePrompt("story", { lastUserMessage: userMessage, allUserMessages }),
      fallback
    );
    return { session, chat: response(session, reply) };
  }

  // story: 请她讲具体一天
  if (session.stage === "story") {
    session.stage = "keyword_followup";
    session.followupCount = 1;
    const keyword = await extractKeyword(userMessage);
    const fallback = `你刚说的"${keyword}"，具体咋弄的？`;
    const reply = await callLlmWithFallback(
      buildStagePrompt("keyword_followup", {
        lastUserMessage: userMessage,
        keyword,
        followupCount: 1,
        allUserMessages
      }),
      fallback
    );
    return { session, chat: response(session, reply) };
  }

  // keyword_followup: 追 2-3 轮
  if (session.stage === "keyword_followup") {
    if (session.followupCount < 3) {
      session.followupCount += 1;
      const keyword = await extractKeyword(userMessage);
      const fallback = `那具体咋办的？`;
      const reply = await callLlmWithFallback(
        buildStagePrompt("keyword_followup", {
          lastUserMessage: userMessage,
          keyword,
          followupCount: session.followupCount,
          allUserMessages
        }),
        fallback
      );
      return { session, chat: response(session, reply) };
    }

    // 追够了，进入 external_evidence，模型生成过渡
    session.stage = "external_evidence";
    const fallback = "你做的这些事，有没有人主动说过你好、觉得离不开你？";
    const reply = await callLlmWithFallback(
      buildStagePrompt("external_evidence", {
        lastUserMessage: userMessage,
        allUserMessages
      }),
      fallback
    );
    return { session, chat: response(session, reply) };
  }

  // external_evidence: 被指定的证据（框架2.0：三个角度，追1-2轮）
  if (session.stage === "external_evidence") {
    if (session.evidenceCount < 2 && /没有|没|不记得|不知道/u.test(userMessage)) {
      session.evidenceCount += 1;
      const fallback = "那客人里、同事里，有没有谁老爱找你、说过你哪点好？";
      const reply = await callLlmWithFallback(
        buildStagePrompt("external_evidence", {
          lastUserMessage: userMessage,
          allUserMessages
        }),
        fallback
      );
      return { session, chat: response(session, reply) };
    }

    if (session.evidenceCount < 2) {
      // 她回答了，还可以再从另一个角度追一轮
      session.evidenceCount += 1;
      const fallback = "你身边干同样活的人，是不是都这样？";
      const reply = await callLlmWithFallback(
        buildStagePrompt("external_evidence", {
          lastUserMessage: userMessage,
          allUserMessages
        }),
        fallback
      );
      return { session, chat: response(session, reply) };
    }

    // 外部证据追够了，进入换尺子
    session.stage = "reference_shift";
    session.referenceStep = 1;
    const fallback = "你身边干同样活的人，是不是都这样？";
    const reply = await callLlmWithFallback(
      buildStagePrompt("reference_shift", {
        lastUserMessage: userMessage,
        allUserMessages
      }),
      fallback
    );
    return { session, chat: response(session, reply) };
  }

  // reference_shift: 换尺子
  if (session.stage === "reference_shift") {
    if (session.referenceStep === 1) {
      // 第一步结束，问第二步
      session.referenceStep = 2;
      const fallback = "那换一个从没干过的人来，今晚让她顶你这个班，会咋样？";
      const reply = await callLlmWithFallback(
        buildStagePrompt("reference_shift", {
          lastUserMessage: userMessage,
          allUserMessages
        }),
        fallback
      );
      return { session, chat: response(session, reply) };
    }

    // 第二步结束，落标配那一句，然后选原话确认
    const quote = await selectQuoteWithContext(messages);
    session.stage = "quote_confirm";
    session.finalQuote = quote;

    const fallback = `${REFERENCE_SHIFT_LINE}\n\n你前面说了一句话，我想跟你确认一下——你说的是『${quote}』，对吗？`;
    const reply = await callLlmWithFallback(
      buildStagePrompt("quote_confirm", {
        lastUserMessage: userMessage,
        allUserMessages
      }),
      fallback,
      160
    );
    return {
      session,
      chat: response(session, reply, { requiresConfirmation: true, quoteCandidate: quote })
    };
  }

  // quote_confirm: 确认原话
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

  // mirror_back → end
  if (session.stage === "mirror_back") {
    session.stage = "end";
    return { session, chat: response(session, END_TEXT, { ended: true }) };
  }

  session.stage = "end";
  return { session, chat: response(session, END_TEXT, { ended: true }) };
}
