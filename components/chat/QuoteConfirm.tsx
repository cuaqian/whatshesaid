"use client";

import { Button } from "@/components/ui/Button";

interface QuoteConfirmProps {
  disabled?: boolean;
  quote: string;
  onConfirm: (answer: string) => void;
}

export function QuoteConfirm({ disabled = false, quote, onConfirm }: QuoteConfirmProps) {
  return (
    <div className="mx-4 mb-3 rounded-3xl border border-stone-200 bg-white/90 p-4 shadow-sm">
      <p className="mb-3 text-sm leading-6 text-stone-600">确认这句是你的原话：</p>
      <p className="mb-4 rounded-2xl bg-stone-50 px-4 py-3 text-[15px] leading-7 text-stone-900">『{quote}』</p>
      <div className="flex gap-2">
        <Button type="button" disabled={disabled} onClick={() => onConfirm("对")}>对</Button>
        <Button type="button" variant="ghost" disabled={disabled} onClick={() => onConfirm("不对")}>不对</Button>
      </div>
    </div>
  );
}
