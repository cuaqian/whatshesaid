"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatResponse, InterviewStage } from "@/types/interview";
import type { UiMessage } from "@/types/message";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { QuoteConfirm } from "./QuoteConfirm";
import { MirrorBack } from "./MirrorBack";
import { LandingScreen } from "./LandingScreen";

const INITIAL_MESSAGE = "我在做一个帮女性看见自己价值的东西。今天我不问你要什么，只想听你讲一件你做过的事。我不会保存你的任何信息。可以吗？";

const TOTAL_STAGES = 5;
const STAGE_LABELS: Partial<Record<InterviewStage, string>> = {
  opening: "", story: "听你讲", keyword_followup: "",
  external_evidence: "别人的眼睛", reference_shift: "换个尺子",
  quote_confirm: "", mirror_back: "", end: ""
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
  const [showMirror, setShowMirror] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [finalQuote, setFinalQuote] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const reset = useCallback(() => {
    setSessionId(null);
    setMessages([{ id: "initial", role: "assistant", content: INITIAL_MESSAGE }]);
    setEnded(false); setStage("opening"); setQuoteCandidate(null); setShowMirror(false); setShowLanding(true);
    setFinalQuote(null);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading, showMirror]);

  async function sendMessage(content: string) {
    if (loading || ended) return;

    // 镜面关闭后触发进入结束语
    if (stage === "mirror_back") {
      setShowMirror(false);
      setLoading(true);
      try {
        // 给后端发空消息，触发 mirror_back → end
        const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sessionId, message: "继续" }) });
        if (!r.ok) throw new Error("");
        const d = (await r.json()) as ChatResponse;
        setSessionId(d.sessionId); setEnded(d.ended); setStage(d.stage);
        if (d.ended) setFinalQuote(null);
        setMessages((c) => [...c, { id: crypto.randomUUID(), role: "assistant", content: d.reply }]);
      } catch {
        setMessages((c) => [...c, { id: crypto.randomUUID(), role: "assistant", content: "就到这。我没有存你任何一句话，不会让你留联系方式，也不给你推荐什么。你可以关掉了——也许你不用再回来。" }]);
      } finally { setLoading(false); }
      return;
    }

    setMessages((c) => [...c, { id: crypto.randomUUID(), role: "user", content }]);
    setLoading(true);

    let sid = sessionId;

    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sid, message: content }) });
      if (!r.ok) throw new Error("");
      const d = (await r.json()) as ChatResponse;
      setSessionId(d.sessionId); setEnded(d.ended); setStage(d.stage);

      // 第五步确认通过 → 进入镜面屏（用后端锁死的那句原话，不依赖前端 state）
      if (d.stage === "mirror_back") {
        setFinalQuote(d.quoteCandidate);
        setShowMirror(true);
        setQuoteCandidate(null);
        setMessages((c) => [...c, { id: crypto.randomUUID(), role: "assistant", content: d.reply }]);
      } else {
        setQuoteCandidate(d.requiresConfirmation ? d.quoteCandidate : null);
        if (d.requiresConfirmation && d.quoteCandidate) {
          setFinalQuote(d.quoteCandidate);
        }
        setMessages((c) => [...c, { id: crypto.randomUUID(), role: "assistant", content: d.reply, quoteCandidate: d.quoteCandidate }]);
      }
    } catch {
      setMessages((c) => [...c, { id: crypto.randomUUID(), role: "assistant", content: "我这边停一下。咱先说你手里这件事。" }]);
    } finally { setLoading(false); }
  }

  const stageIndex = Math.min(stageToIndex(stage), TOTAL_STAGES);
  // 只在前四步显示进度，第五步（镜面）和结束后隐藏
  const showProgress = !ended && stage !== "opening" && stage !== "mirror_back" && stage !== "end";

  // === 入口屏 ===
  if (showLanding && !sessionId) {
    return <LandingScreen onStart={() => setShowLanding(false)} />;
  }

  // === 镜面屏 ===
  if (showMirror && finalQuote) {
    return <MirrorBack quote={finalQuote} onDone={() => sendMessage("继续")} />;
  }

  return (
    <main className="mx-auto flex h-[100dvh] w-full flex-col relative z-10 sm:max-w-lg md:max-w-xl lg:max-w-3xl xl:max-w-5xl lg:border-x lg:border-[#e8ddd1]/50">
      {/* header */}
      <header className="px-5 sm:px-8 pt-6 pb-4 lg:pt-10">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] sm:text-xs tracking-[0.32em] text-[#b5a99f]">她说过</p>
            <h1 className="mt-0.5 text-2xl lg:text-3xl font-normal text-[#3a2e28] tracking-wide">&nbsp;</h1>
          </div>
          {showProgress && (
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
      <section className="flex-1 overflow-y-auto px-5 sm:px-8 py-2 lg:py-4">
        <div className="space-y-5 lg:space-y-6">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {loading && (
            <div className="flex justify-start msg-enter">
              <div className="rounded-2xl bg-white/80 px-5 py-3.5 shadow-sm">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d4a99a] [animation-delay:0s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d4a99a] [animation-delay:0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d4a99a] [animation-delay:0.3s]" />
                </span>
              </div>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </section>

      {quoteCandidate && !loading ? <QuoteConfirm quote={quoteCandidate} onConfirm={sendMessage} /> : null}

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
