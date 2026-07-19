"use client";

import type { UiMessage } from "@/types/message";

export function MessageBubble({ message }: { message: UiMessage; isLatest?: boolean }) {
  const isAssistant = message.role === "assistant";

  if (isAssistant && message.quoteCandidate) {
    // 返还原话的消息不重复显示（MirrorBack 已经做了）
    return (
      <div className="msg-enter flex justify-start">
        <div className="max-w-[85%]">
          <div className="rounded-2xl bg-white/80 px-4 py-3 text-[15px] leading-relaxed text-[#3a2e28] shadow-sm">
            <span>{message.content}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`msg-enter flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div className="max-w-[85%]">
        {isAssistant ? (
          <div className="rounded-2xl bg-white/80 px-4 py-3 text-[15px] leading-relaxed text-[#3a2e28] shadow-sm">
            <span>{message.content}</span>
          </div>
        ) : (
          <div className="rounded-2xl rounded-br-md bg-[#3a2e28] px-4 py-3 text-[15px] leading-relaxed text-white/90 shadow-sm">
            <span>{message.content}</span>
          </div>
        )}
      </div>
    </div>
  );
}
