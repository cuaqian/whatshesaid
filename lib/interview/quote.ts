import type { ChatMessage } from "@/types/message";

const WEAK_PHRASES = ["不知道", "随便", "还好", "没有", "嗯", "可以", "好的", "对", "是"];
const ACTION_HINTS = ["做", "弄", "看", "说", "问", "拿", "给", "找", "改", "算", "记", "查", "带", "安排", "处理", "协调", "收", "发", "跑", "顶", "接", "管"];

function splitIntoCandidates(text: string): string[] {
  return text
    .split(/[。！？!?；;\n]/u)
    .map((item) => item.trim().replace(/^[-—，,、\s]+/u, ""))
    .filter(Boolean);
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
