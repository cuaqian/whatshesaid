import type { ChatResponse, InterviewSession } from "@/types/interview";
import type { ChatMessage } from "@/types/message";
import { createLlmClient, isDemoMode } from "@/lib/llm/client";
import type { LlmMessage } from "@/lib/llm/types";
import { SYSTEM_PROMPT, buildStagePrompt, buildKeywordExtractionPrompt } from "./prompts";
import { isAffirmative, isNegative, isPoliteAgreement, sanitizeAssistantReply, violatesGuardrails } from "./guardrails";
import { isExactUserQuote, findRealizationQuote, pickQuoteCandidate } from "./quote";
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

function isShortOrDeflecting(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length <= 6) return true;
  if (/^(不知道|忘了|想不起来|没什么|没了|没了啊|没)$/u.test(trimmed)) return true;
  if (/^(随便|不清楚|记不清|不记得|没注意|没印象)$/u.test(trimmed)) return true;
  if (/^.{1,4}[呀啊嗯哈哦呢]$/u.test(trimmed)) return true; // "自己想好的词呀"
  return false;
}

/**
 * 调 LLM —— 传完整对话历史，让模型看到她说过的每一句话。
 * systemPrompt 是规则 + 当前阶段目标，messages 是真实的对话记录。
 */
async function callLlmWithFallback(
  systemPrompt: string,
  fallback: string,
  messages: ChatMessage[],
  maxTokens = 120
): Promise<string> {
  if (isDemoMode()) {
    return fallback;
  }
  try {
    const llm = createLlmClient();
    // 构造上下文：system prompt + 完整对话历史
    const context: LlmMessage[] = [
      { role: "system", content: systemPrompt }
    ];
    for (const msg of messages) {
      context.push({ role: msg.role as "user" | "assistant", content: msg.content });
    }
    const reply = await llm.generate(context, { temperature: 0.3, maxTokens });
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

  // 优先：本地直接找最近一条自觉悟句子（避免 LLM 选回前面的动作句）
  const realization = findRealizationQuote(messages);
  if (realization) {
    return realization;
  }

  if (isDemoMode()) {
    return pickQuoteCandidate(messages);
  }

  try {
    const quotePrompt = `${SYSTEM_PROMPT}

从她说过的话里选一句最适合还给她的原话。
要求：只能返回她原文中的连续片段，不能改一个字，不能润色，不能加标点。
优先级：
1. 如果她最近自己说了一句明显的"自觉悟"的话——包含"跳出""外行""稀缺""同行标准""原来""其实""不一样"等——优先选这句。
2. 否则选那句最具体、有动作、有现场感、她脱口而出却轻轻带过的。

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

  // 如果上一场已经结束，用户发任何消息就当作新对话重置
  if (session.stage === "end") {
    if (!userMessage) {
      return { session, chat: response(session, END_TEXT, { ended: true }) };
    }
    // 重置会话
    session.stage = "opening";
    session.finalQuote = null;
    session.quoteConfirmed = false;
    session.followupCount = 0;
    session.evidenceCount = 0;
    session.referenceStep = 0;
    // 接着走下面的 opening 分支
  }

  // opening: 固定开场
  if (session.stage === "opening") {
    session.stage = "story";
    if (!userMessage) {
      return { session, chat: response(session, OPENING_TEXT) };
    }
    // 用户回应了"可以吗"，模型生成 story 阶段的问题
    const fallback = "你做过的事里，印象最深的是哪一段？带我回那一天——几点开始、什么环境、跟谁一起、先干了什么？";
    const reply = await callLlmWithFallback(
      buildStagePrompt("story", { lastUserMessage: userMessage, allUserMessages }),
      fallback,
      messages
    );
    return { session, chat: response(session, reply) };
  }

  // story: 请她讲具体一天
  if (session.stage === "story") {
    session.stage = "keyword_followup";
    session.followupCount = 1;
    const keyword = await extractKeyword(userMessage);
    const fallback = `你刚说的"${keyword}"，具体怎么做的？`;
    const reply = await callLlmWithFallback(
      buildStagePrompt("keyword_followup", {
        lastUserMessage: userMessage,
        keyword,
        followupCount: 1,
        allUserMessages
      }),
      fallback,
      messages
    );
    return { session, chat: response(session, reply) };
  }

  // keyword_followup: 追 1-2 轮；用户短答/敷衍就立刻推进
  if (session.stage === "keyword_followup") {
    // 用户给了短答或敷衍，先存一下之前的回答，立刻推进到 external_evidence
    if (isShortOrDeflecting(userMessage)) {
      session.stage = "external_evidence";
      const fallback = "你说的这事，有没有人当时就夸你、或者让你继续做？";
      const reply = await callLlmWithFallback(
        buildStagePrompt("external_evidence", {
          lastUserMessage: userMessage,
          allUserMessages
        }),
        fallback
      ,
      messages
    );
      return { session, chat: response(session, reply) };
    }

    // 最多追 2 轮（之前 3 轮太长，用户体验差）
    if (session.followupCount < 2) {
      session.followupCount += 1;
      const keyword = await extractKeyword(userMessage);
      const fallback = `那具体怎么做的？`;
      const reply = await callLlmWithFallback(
        buildStagePrompt("keyword_followup", {
          lastUserMessage: userMessage,
          keyword,
          followupCount: session.followupCount,
          allUserMessages
        }),
        fallback
      ,
      messages
    );
      return { session, chat: response(session, reply) };
    }

    // 追够了，进入 external_evidence
    session.stage = "external_evidence";
    const fallback = "你说的这事，有没有人当时就夸你、或者让你继续做？";
    const reply = await callLlmWithFallback(
      buildStagePrompt("external_evidence", {
        lastUserMessage: userMessage,
        allUserMessages
      }),
      fallback
    ,
      messages
    );
    return { session, chat: response(session, reply) };
  }

  // external_evidence: v2.1 第三步——LLM 根据语境问，v2.1 原文当 fallback
  if (session.stage === "external_evidence") {
    // 用户说"没有/没"，v2.1换问："那客人里、同事里…"
    if (/^没有$|^没$|^没有呢$|^没呢$/u.test(userMessage)) {
      const reply = await callLlmWithFallback(
        buildStagePrompt("external_evidence", { lastUserMessage: userMessage, allUserMessages }),
        EXTERNAL_EVIDENCE_FALLBACK
      ,
      messages
    );
      return { session, chat: response(session, reply) };
    }
    // 用户答了，进第四步
    session.stage = "reference_shift";
    session.referenceStep = 1;
    const reply = await callLlmWithFallback(
      buildStagePrompt("reference_shift", { lastUserMessage: userMessage, allUserMessages }),
      REFERENCE_PEER_PROMPT
    ,
      messages
    );
    return { session, chat: response(session, reply) };
  }

  // reference_shift: v2.1 第四步——LLM 根据语境问两步，标配落语固定
  if (session.stage === "reference_shift") {
    if (session.referenceStep === 1) {
      session.referenceStep = 2;
      const reply = await callLlmWithFallback(
        buildStagePrompt("reference_shift", { lastUserMessage: userMessage, allUserMessages }),
        REFERENCE_OUTSIDER_PROMPT
      ,
      messages
    );
      return { session, chat: response(session, reply) };
    }

    if (session.referenceStep === 2) {
      session.referenceStep = 3;
      return { session, chat: response(session, REFERENCE_SHIFT_LINE) };
    }

    // step=3：选原话确认
    const quote = await selectQuoteWithContext(messages);
    session.stage = "quote_confirm";
    session.finalQuote = quote;
    const fallback = `你前面说了一句话，我想跟你确认一下——你说的是『${quote}』，对吗？`;
    const reply = await callLlmWithFallback(
      buildStagePrompt("quote_confirm", { lastUserMessage: userMessage, allUserMessages }),
      fallback,
      messages,
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
      // v2.1: 若原话含具体比喻（"像X一样/像X似的"），顺着词点一句
      const quoteText = session.finalQuote ?? "";
      const hasMetaphor = /像.+一样|像.+似的|像.+般|仿佛|宛如|犹如/u.test(quoteText);
      return {
        session,
        chat: response(session, hasMetaphor ? `${MIRROR_BACK_TEXT}\n\n${MIRROR_BACK_WITH_METAPHOR}` : MIRROR_BACK_TEXT)
      };
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
