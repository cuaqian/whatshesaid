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
 * 在用户最新消息中找自觉悟原话。
 * 优先看最近一条 message（换尺子之后她最有可能自己悟出 payoff 那一句），
 * 如果最近一条没有，去前面找第一个含 2 个以上 realization 关键词的句子。
 */
export function findRealizationQuote(messages: ChatMessage[]): string | null {
  const userMessages = messages.filter((message) => message.role === "user");
  if (userMessages.length === 0) return null;

  // 从最新一条用户消息向前遍历
  for (let i = userMessages.length - 1; i >= 0; i--) {
    const candidates = splitIntoCandidates(userMessages[i].content);
    // 选该条消息里含 realization 关键词最长的那个候选
    const ranked = candidates
      .map((c) => ({ c, hits: REALIZATION_HINTS.filter((h) => c.includes(h)).length }))
      .filter((x) => x.hits > 0)
      .sort((a, b) => b.hits - a.hits || b.c.length - a.c.length);
    if (ranked.length > 0) {
      return ranked[0].c;
    }
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

export function isExactUserQuote(quote: string, messages: ChatMessage[]): boolean {
  return messages.some((message) => message.role === "user" && message.content.includes(quote));
}
