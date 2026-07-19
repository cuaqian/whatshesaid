"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatResponse, InterviewStage } from "@/types/interview";
import type { UiMessage } from "@/types/message";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { QuoteConfirm } from "./QuoteConfirm";

const INITIAL_MESSAGE = "我在做一个帮女性看见自己价值的东西。今天我不问你要什么只想听你讲一件你做过的事。我不会保存你的任何信息。可以吗？";
const SESSION_KEY = "whatshesaid_session";

const TOTAL_STAGES = 5;
const STAGE_LABELS: Partial<Record<InterviewStage, string>> = {
  opening: "开场", story: "听你讲", keyword_followup: "追问",
  external_evidence: "别人的眼睛", reference_shift: "换个尺子",
  quote_confirm: "那句你说过的话", mirror_back: "听见自己", end: ""
};

function stageToIndex(stage: InterviewStage): number {
  return ({ opening: 0, story: 1, keyword_followup: 1, external_evidence: 2, reference_shift: 3, quote_confirm: 4, mirror_back: 5, end: 5 } as Record<string, number>)[stage] ?? 0;
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
    setEnded(false); setStage("opening"); setQuoteCandidate(null);
    try { window.localStorage.removeItem(SESSION_KEY); } catch { /* */ }
  }, []);

  useEffect(() => {
    try { const s = window.localStorage.getItem(SESSION_KEY); if (s) setSessionId(s); } catch { /* */ }
  }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading, quoteCandidate]);

  async function sendMessage(content: string) {
    if (loading || ended) return;

    setMessages((c) => [...c, { id: crypto.randomUUID(), role: "user", content }]);
    setLoading(true); setQuoteCandidate(null);

    let sid = sessionId;
    try { const s = window.localStorage.getItem(SESSION_KEY); if (s) sid = s; } catch { /* */ }

    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sid, message: content }) });
      if (!r.ok) throw new Error("");
      const d = (await r.json()) as ChatResponse;
      setSessionId(d.sessionId); setEnded(d.ended); setStage(d.stage);
      setQuoteCandidate(d.requiresConfirmation ? d.quoteCandidate : null);
      try { if (d.sessionId) window.localStorage.setItem(SESSION_KEY, d.sessionId); } catch { /* */ }
      setMessages((c) => [...c, { id: crypto.randomUUID(), role: "assistant", content: d.reply, quoteCandidate: d.quoteCandidate }]);
    } catch {
      setMessages((c) => [...c, { id: crypto.randomUUID(), role: "assistant", content: "我这边停一下。咱先说你手里这件事。" }]);
    } finally { setLoading(false); }
  }

  const stageIndex = Math.min(stageToIndex(stage), TOTAL_STAGES);

  return (
    <main className="mx-auto flex h-[100dvh] max-w-md flex-col relative z-10">
      {/* header */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] tracking-[0.32em] text-[#b5a99f] uppercase">What She Said</p>
            <h1 className="mt-0.5 text-2xl font-normal text-[#3a2e28] tracking-wide">她说过</h1>
          </div>
          {!ended && stage !== "opening" && (
            <div className="flex flex-col items-end gap-2 pb-0.5">
              <span className="text-xs text-[#b5a99f]">{STAGE_LABELS[stage]}</span>
              <div className="flex gap-1.5">
                {Array.from({ length: TOTAL_STAGES }, (_, i) => (
                  <div key={i}
                    className={`h-[3px] rounded-full transition-all duration-500 ${i < stageIndex ? "w-5 bg-[#d4a99a]" : "w-3 bg-[#e8ddd1]"}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* messages */}
      <section className="flex-1 overflow-y-auto px-5 py-2">
        <div className="space-y-5">
          {messages.map((msg, i) => (
            <MessageBubble key={msg.id} message={msg} isLatest={i === messages.length - 1 && msg.role === "assistant"} />
          ))}
          {loading && (
            <div className="flex justify-start msg-enter">
              <div className="rounded-2xl bg-white/80 px-5 py-3.5 shadow-sm">
                {stage === "quote_confirm" || stage === "mirror_back"
                  ? <span className="text-sm text-[#b5a99f] italic">想把她说过的那句话还给她……</span>
                  : <span className="flex gap-1"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d4a99a] [animation-delay:0s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d4a99a] [animation-delay:0.15s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d4a99a] [animation-delay:0.3s]" /></span>}
              </div>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </section>

      {/* quote confirm */}
      {quoteCandidate && !loading && <QuoteConfirm quote={quoteCandidate} onConfirm={sendMessage} />}

      {/* input */}
      {ended ? (
        <div className="border-t border-[#e8ddd1] bg-[#faf5ee] px-5 py-6 text-center">
          <button onClick={reset}
            className="text-sm tracking-wide text-[#b5a99f] transition-colors hover:text-[#8b7d73]"
          >
            ✦ 重新开始
          </button>
        </div>
      ) : (
        <ChatInput disabled={loading} ended={ended} onSend={sendMessage} />
      )}
    </main>
  );
}
