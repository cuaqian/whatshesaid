import type { ChatMessage } from "@/types/message";

const WEAK_PHRASES = ["不知道", "随便", "还好", "没有", "嗯", "可以", "好的", "对", "是"];
const ACTION_HINTS = ["做", "弄", "看", "说", "问", "拿", "给", "找", "改", "算", "记", "查", "带", "安排", "处理", "协调", "收", "发", "跑", "顶", "接", "管"];
const REALIZATION_HINTS = [
  "跳出", "外行", "稀缺", "同行标准", "标配", "标榜",
  "看不见", "没在意", "没意识", "不当回事", "习以为常",
  "原来", "才发现", "其实", "我一直", "我只是", "我只是没",
  "不一样", "差别", "差距", "不像", "不是每个"
];

function splitIntoCandidates(text: string): string[] {
  return text
    .split(/[。！？!?；;\n]/u)
    .map((item) => item.trim().replace(/^[-—，,、\s]+/u, ""))
    .filter(Boolean);
}

function isRealization(candidate: string): boolean {
  return REALIZATION_HINTS.some((hint) => candidate.includes(hint));
}

/**
 * 在用户消息中找自觉悟原话。
 * 从最新往前搜，但最后一条消息至少要有 2 个觉悟关键词才算（防止"复读"普通应答）。
 * 前面消息含 1 个即可命中——那是她脱口而出、却轻轻带过的句子。
 */
export function findRealizationQuote(messages: ChatMessage[]): string | null {
  const userMessages = messages.filter((message) => message.role === "user");
  if (userMessages.length === 0) return null;

  for (let i = userMessages.length - 1; i >= 0; i--) {
    const candidates = splitIntoCandidates(userMessages[i].content);
    const ranked = candidates
      .map((c) => ({ c, hits: REALIZATION_HINTS.filter((h) => c.includes(h)).length }))
      .filter((x) => x.hits > 0)
      .sort((a, b) => b.hits - a.hits || b.c.length - a.c.length);
    if (ranked.length === 0) continue;

    // 最后一条消息：至少 2 个觉悟关键词才算（防复读）
    if (i === userMessages.length - 1 && ranked[0].hits < 2) {
      continue;
    }

    return ranked[0].c;
  }
  return null;
}

function scoreCandidate(candidate: string): number {
  if (candidate.length < 8 || candidate.length > 80) {
    return -10;
  }

  if (WEAK_PHRASES.includes(candidate)) {
    return -10;
  }

  let score = Math.min(candidate.length, 40);

  for (const hint of ACTION_HINTS) {
    if (candidate.includes(hint)) {
      score += 10;
    }
  }

  if (/\d|点|早上|晚上|那天|老板|客人|同事|现场|班/u.test(candidate)) {
    score += 12;
  }

  if (/我/u.test(candidate)) {
    score += 6;
  }

  // 自觉悟句子大幅加分——优先选这种"她自己撞到的答案"
  if (isRealization(candidate)) {
    score += 50;
  }

  return score;
}

export function extractQuoteCandidates(messages: ChatMessage[]): string[] {
  const candidates = messages
    .filter((message) => message.role === "user")
    .flatMap((message) => splitIntoCandidates(message.content));

  return [...new Set(candidates)]
    .map((candidate) => ({ candidate, score: scoreCandidate(candidate) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.candidate);
}

export function pickQuoteCandidate(messages: ChatMessage[], exclude: string[] = []): string {
  return extractQuoteCandidates(messages).find((candidate) => !exclude.includes(candidate)) ?? "你做过的事里，印象最深的是哪一段";
}

/**
 * 严格校验：quote 必须是用户原文中的连续片段。
 * uses `includes` 做子串匹配，但额外拒绝过短（<4字）和过长（>80字）的片段。
 */
export function isExactUserQuote(quote: string, messages: ChatMessage[]): boolean {
  const cleaned = quote.trim().replace(/^['"「『]+|['"」』]+$/gu, "");
  if (cleaned.length < 4 || cleaned.length > 80) return false;
  return messages.some(
    (message) => message.role === "user" && message.content.includes(cleaned)
  );
}
