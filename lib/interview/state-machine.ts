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

function isShortOrDeflecting(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length <= 6) return true;
  if (/^(不知道|忘了|想不起来|没啥|没了|没了啊|没)$/u.test(trimmed)) return true;
  if (/^(随便|不清楚|记不清|不记得|没注意|没印象)$/u.test(trimmed)) return true;
  if (/^.{1,4}[呀啊嗯哈哦呢]$/u.test(trimmed)) return true; // "自己想好的词呀"
  return false;
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
      );
      return { session, chat: response(session, reply) };
    }

    // 最多追 2 轮（之前 3 轮太长，用户体验差）
    if (session.followupCount < 2) {
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

    // 追够了，进入 external_evidence
    session.stage = "external_evidence";
    const fallback = "你说的这事，有没有人当时就夸你、或者让你继续做？";
    const reply = await callLlmWithFallback(
      buildStagePrompt("external_evidence", {
        lastUserMessage: userMessage,
        allUserMessages
      }),
      fallback
    );
    return { session, chat: response(session, reply) };
  }

  // external_evidence: 被指定的证据（用户短答直接跳过，进入换尺子）
  if (session.stage === "external_evidence") {
    // 用户给了短答或敷衍，立刻推进到 reference_shift
    if (isShortOrDeflecting(userMessage)) {
      session.stage = "reference_shift";
      session.referenceStep = 1;
      const fallback = "嗯。那你身边干同样活的，是不是也这样？";
      const reply = await callLlmWithFallback(
        buildStagePrompt("reference_shift", {
          lastUserMessage: userMessage,
          allUserMessages
        }),
        fallback
      );
      return { session, chat: response(session, reply) };
    }

    // 最多 1 轮（之前 2 轮太长）；问完直接进 reference_shift
    session.stage = "reference_shift";
    session.referenceStep = 1;
    const fallback = "你身边干同样活的，是不是也都这样？";
    const reply = await callLlmWithFallback(
      buildStagePrompt("reference_shift", {
        lastUserMessage: userMessage,
        allUserMessages
      }),
      fallback
    );
    return { session, chat: response(session, reply) };
  }

  // reference_shift: 换尺子（三步，demo 脚本要求的精确节奏）
  if (session.stage === "reference_shift") {
    if (session.referenceStep === 1) {
      // 第一步：同行都这样吗？→ 进入第二步
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

    if (session.referenceStep === 2) {
      // 第二步：外行顶班会怎样？→ 落"标配"那句，然后停下，等她自己的反应
      session.referenceStep = 3;
      const reply = REFERENCE_SHIFT_LINE;
      // 不调模型，落完标配就停——给她空间自己绕一圈撞到答案
      return { session, chat: response(session, reply) };
    }

    // 第三步：她已经说了自己的反应（可能是自觉悟的句子），现在选原话确认
    const quote = await selectQuoteWithContext(messages);
    session.stage = "quote_confirm";
    session.finalQuote = quote;
    const fallback = `你前面说了一句话，我想跟你确认一下——你说的是『${quote}』，对吗？`;
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
