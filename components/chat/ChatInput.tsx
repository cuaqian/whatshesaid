"use client";

import { useState } from "react";

interface Props {
  disabled: boolean;
  ended: boolean;
  onSend: (content: string) => void;
}

export function ChatInput({ disabled, onSend }: Props) {
  const [value, setValue] = useState("");

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    setValue("");
    onSend(trimmed);
  }

  return (
    <div className="border-t border-[#e8ddd1] bg-[#faf5ee] px-4 py-4">
      <div className="flex items-end gap-2 rounded-2xl bg-white/80 px-4 py-2 shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-1 focus-within:ring-[#d4a99a]/30">
        <textarea
          className="max-h-28 min-h-[40px] flex-1 resize-none border-0 bg-transparent py-1.5 text-[15px] leading-relaxed text-[#3a2e28] placeholder-[#c4b8ad] outline-none"
          placeholder="说你想说的"
          rows={1}
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <button
          disabled={disabled || !value.trim()}
          className="mb-1 shrink-0 rounded-full p-1.5 text-[#d4a99a] transition-colors hover:text-[#b88475] disabled:text-[#e0d5ca]"
          onClick={handleSubmit}
          aria-label="发送"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
