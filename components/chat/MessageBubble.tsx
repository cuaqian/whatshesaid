"use client";

import type { UiMessage } from "@/types/message";

export function MessageBubble({ message, isLatest }: { message: UiMessage; isLatest?: boolean }) {
  const isAssistant = message.role === "assistant";

  return (
    <div className={`msg-enter flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[85%] ${isAssistant ? "" : "flex flex-col items-end"}`}>
        {/* assistant bubble */}
        {isAssistant && (
          <div className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
            message.quoteCandidate
              ? "mirror-card text-[#3a2e28]"
              : "bg-white/80 text-[#3a2e28] shadow-sm"
          }`}>
            <span>{message.content}</span>
          </div>
        )}

        {/* user bubble */}
        {!isAssistant && (
          <div className="rounded-2xl rounded-br-md bg-[#3a2e28] px-4 py-3 text-[15px] leading-relaxed text-white/90 shadow-sm">
            <span>{message.content}</span>
          </div>
        )}

        {/* subtle timestamp feel */}
        {isLatest && isAssistant && !message.quoteCandidate && (
          <p className="mt-1 ml-1 text-[11px] text-[#d4c8bb]">· · ·</p>
        )}
      </div>
    </div>
  );
}
