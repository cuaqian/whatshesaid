"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatResponse } from "@/types/interview";
import type { UiMessage } from "@/types/message";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { QuoteConfirm } from "./QuoteConfirm";
import { LoadingDots } from "@/components/ui/LoadingDots";

const INITIAL_MESSAGE = "我在做一个帮女性看见自己价值的东西。今天我不问你要什么，只想听你讲一件你做过的事。你可以直接说话，也可以打字。我不会保存你的任何信息。可以吗？";
const SESSION_KEY = "whatshesaid_session";

export function ChatWindow() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([
    { id: "initial", role: "assistant", content: INITIAL_MESSAGE }
  ]);
  const [loading, setLoading] = useState(false);
  const [ended, setEnded] = useState(false);
  const [quoteCandidate, setQuoteCandidate] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // 启动时从 localStorage 恢复 sessionId
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SESSION_KEY);
      if (stored) {
        setSessionId(stored);
      }
    } catch {
      // localStorage 不可用，忽略
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, quoteCandidate]);

  async function sendMessage(content: string) {
    if (loading || ended) {
      return;
    }

    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content
    };
    setMessages((current) => [...current, userMessage]);
    setLoading(true);
    setQuoteCandidate(null);

    // 用最新的 sessionId（state 闭包可能滞后）
    let currentSessionId = sessionId;
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(SESSION_KEY);
        if (stored) currentSessionId = stored;
      } catch {
        // ignore
      }
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: currentSessionId, message: content })
      });

      if (!response.ok) {
        throw new Error("chat request failed");
      }

      const data = (await response.json()) as ChatResponse;
      setSessionId(data.sessionId);
      setEnded(data.ended);
      setQuoteCandidate(data.requiresConfirmation ? data.quoteCandidate : null);

      // 同步到 localStorage，刷新页面也不丢
      try {
        if (data.sessionId) {
          window.localStorage.setItem(SESSION_KEY, data.sessionId);
        }
      } catch {
        // ignore
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply,
          requiresConfirmation: data.requiresConfirmation,
          quoteCandidate: data.quoteCandidate
        }
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "我这边停一下。咱先说你手里这件事。"
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex h-[100dvh] max-w-md flex-col bg-[#fbf7f2] shadow-2xl shadow-stone-200/60">
      <header className="border-b border-stone-200 px-5 py-4">
        <p className="text-xs tracking-[0.28em] text-stone-500">WHAT SHE SAID</p>
        <h1 className="mt-1 text-lg font-semibold text-stone-900">她说过</h1>
      </header>

      <section className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {loading ? (
            <div className="flex justify-start">
              <div className="rounded-3xl rounded-bl-md border border-stone-200 bg-white/85 px-4 py-2 shadow-sm">
                <LoadingDots />
              </div>
            </div>
          ) : null}
        </div>
        <div ref={bottomRef} />
      </section>

      {quoteCandidate && !loading ? <QuoteConfirm quote={quoteCandidate} onConfirm={sendMessage} /> : null}
      <ChatInput disabled={loading} ended={ended} onSend={sendMessage} />
    </main>
  );
}
