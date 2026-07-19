"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";

interface ChatInputProps {
  disabled?: boolean;
  ended?: boolean;
  onSend: (message: string) => void;
}

export function ChatInput({ disabled = false, ended = false, onSend }: ChatInputProps) {
  const [value, setValue] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = value.trim();
    if (!message || disabled || ended) {
      return;
    }
    setValue("");
    onSend(message);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-stone-200 bg-[#fbf7f2]/95 px-4 py-3 backdrop-blur">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled || ended}
        rows={1}
        placeholder={ended ? "已经结束" : "打字说一段也可以"}
        className="max-h-28 min-h-12 flex-1 resize-none rounded-3xl border border-stone-200 bg-white px-4 py-3 text-[16px] leading-6 text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-400"
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <Button type="submit" disabled={disabled || ended || !value.trim()} className="h-12 px-5">
        发送
      </Button>
    </form>
  );
}
