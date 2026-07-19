"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatResponse, InterviewStage } from "@/types/interview";
import type { UiMessage } from "@/types/message";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { QuoteConfirm } from "./QuoteConfirm";
import { LoadingDots } from "@/components/ui/LoadingDots";

const INITIAL_MESSAGE = "我在做一个帮女性看见自己价值的东西。今天我不问你要什么，只想听你讲一件你做过的事。你可以直接说话，也可以打字。我不会保存你的任何信息。可以吗？";
const SESSION_KEY = "whatshesaid_session";

const STAGE_LABELS: Partial<Record<InterviewStage, string>> = {
  opening: "开场",
  story: "带回现场",
  keyword_followup: "追问细节",
  external_evidence: "被认可的证明",
  reference_shift: "换个角度看自己",
  quote_confirm: "把话说给你听",
  mirror_back: "你已说出口",
  end: "结束"
};

const TOTAL_STAGES = 5;

function stageToIndex(stage: InterviewStage): number {
  const map: Partial<Record<InterviewStage, number>> = {
    opening: 0, story: 1, keyword_followup: 1,
    external_evidence: 2, reference_shift: 3,
    quote_confirm: 4, mirror_back: 5, end: 5
  };
  return Math.min(map[stage] ?? 0, TOTAL_STAGES);
}

export function ChatWindow() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([
    { id: "initial", role: "assistant", content: INITIAL_MESSAGE }
  ]);
  const [loading, setLoading] = useState(false);
  const [ended, setEnded] = useState(false);
  const [stage, setStage] = useState<InterviewStage>("opening");
  const [quoteCandidate, setQuoteCandidate] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const reset = useCallback(() => {
    setSessionId(null);
    setMessages([{ id: "initial", role: "assistant", content: INITIAL_MESSAGE }]);
    setEnded(false);
    setStage("opening");
    setQuoteCandidate(null);
    try { window.localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SESSION_KEY);
      if (stored) setSessionId(stored);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, quoteCandidate]);

  async function sendMessage(content: string) {
    if (loading || ended) return;
    if (ended) { reset(); return; }

    const userMessage: UiMessage = { id: crypto.randomUUID(), role: "user", content };
    setMessages((current) => [...current, userMessage]);
    setLoading(true);
    setQuoteCandidate(null);

    let currentSessionId = sessionId;
    if (typeof window !== "undefined") {
      try { const s = window.localStorage.getItem(SESSION_KEY); if (s) currentSessionId = s; } catch { /* ignore */ }
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: currentSessionId, message: content })
      });
      if (!response.ok) throw new Error("chat request failed");

      const data = (await response.json()) as ChatResponse;
      setSessionId(data.sessionId);
      setEnded(data.ended);
      setStage(data.stage);
      setQuoteCandidate(data.requiresConfirmation ? data.quoteCandidate : null);
      try { if (data.sessionId) window.localStorage.setItem(SESSION_KEY, data.sessionId); } catch { /* ignore */ }

      setMessages((current) => [...current, {
        id: crypto.randomUUID(), role: "assistant",
        content: data.reply,
        requiresConfirmation: data.requiresConfirmation,
        quoteCandidate: data.quoteCandidate
      }]);
    } catch {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(), role: "assistant",
        content: "我这边停一下。咱先说你手里这件事。"
      }]);
    } finally {
      setLoading(false);
    }
  }

  const stageIndex = stageToIndex(stage);
  const stageLabel = STAGE_LABELS[stage] ?? "";

  return (
    <main className="mx-auto flex h-[100dvh] max-w-md flex-col bg-[#fbf7f2] shadow-2xl shadow-stone-200/60">
      {/* header */}
      <header className="border-b border-stone-200 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.28em] text-stone-500">WHAT SHE SAID</p>
            <h1 className="mt-1 text-lg font-semibold text-stone-900">她说过</h1>
          </div>
          {!ended && stage !== "opening" && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] text-stone-400">{stageLabel}</span>
              <div className="flex gap-1">
                {Array.from({ length: TOTAL_STAGES }, (_, i) => (
                  <div
                    key={i}
                    className={`h-1 w-4 rounded-full transition-colors ${i < stageIndex ? "bg-stone-700" : "bg-stone-200"}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* messages */}
      <section className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-3xl rounded-bl-md border border-stone-200 bg-white/85 px-5 py-3 shadow-sm">
                {stage === "quote_confirm" || stage === "mirror_back"
                  ? <p className="text-sm text-stone-400">正在确认那句你说过的话……</p>
                  : <LoadingDots />}
              </div>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </section>

      {/* quote confirm */}
      {quoteCandidate && !loading ? <QuoteConfirm quote={quoteCandidate} onConfirm={sendMessage} /> : null}

      {/* input or reset */}
      {ended ? (
        <div className="border-t border-stone-200 bg-[#fbf7f2] px-4 py-4 text-center">
          <button
            onClick={reset}
            className="text-sm text-stone-500 underline underline-offset-4 hover:text-stone-700"
          >
            重新开始一次访谈
          </button>
        </div>
      ) : (
        <ChatInput disabled={loading} ended={ended} onSend={sendMessage} />
      )}
    </main>
  );
}
