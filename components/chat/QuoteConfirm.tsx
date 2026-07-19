"use client";

export function QuoteConfirm({ quote, onConfirm }: { quote: string | null; onConfirm: (content: string) => void }) {
  if (!quote) return null;

  return (
    <div className="border-t border-[#e8ddd1] bg-[#faf5ee] px-5 py-5">
      <div className="mirror-card rounded-2xl px-5 py-4">
        <p className="mb-3 text-sm leading-relaxed text-[#8b7d73]">
          她说她看见了自己说过的话。
        </p>
        <p className="mb-4 text-[17px] font-medium leading-relaxed text-[#3a2e28]">
          「{quote.trim().replace(/^[「『"/]+|[」』"、]+$/gu, "")}」
        </p>
        <div className="flex gap-3">
          <button
            className="flex-1 rounded-xl border border-[#d4a99a] bg-white px-4 py-2.5 text-sm text-[#8b7d73] transition-colors hover:bg-[#f5edea] active:scale-[0.98]"
            onClick={() => onConfirm("不对，不是这一句")}
          >
            这不是我的原话
          </button>
          <button
            className="flex-1 rounded-xl bg-[#3a2e28] px-4 py-2.5 text-sm text-white transition-colors hover:bg-[#5b4a3e] active:scale-[0.98]"
            onClick={() => onConfirm("对")}
          >
            对，我说过
          </button>
        </div>
      </div>
    </div>
  );
}
