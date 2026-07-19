"use client";

import { useEffect, useState } from "react";

interface Props {
  quote: string;
  onDone: () => void;
}

export function MirrorBack({ quote, onDone }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f5f0ea] px-6">
      {/* 镜面背景 — 微光 + 细腻渐变模拟反射 */}
      <div className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 50% 45%, rgba(255,255,255,0.8) 0%, transparent 70%),
            radial-gradient(ellipse 80% 50% at 50% 55%, rgba(212,169,154,0.06) 0%, transparent 60%),
            linear-gradient(180deg, #f5f0ea 0%, #f9f6f2 50%, #f0ebe4 100%)
          `
        }}
      />

      {/* 镜面光晕 */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 40%, rgba(255,255,255,0.08) 60%, transparent 100%)"
        }}
      />

      {/* 主内容 */}
      <div className={`relative z-10 max-w-sm text-center transition-all duration-[1.2s] ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}>
        {/* 引导语 — 极克制 */}
        <p className="mb-8 text-[13px] tracking-[0.2em] text-[#b5a99f]">
          她说过
        </p>

        {/* 原话 — 镜面核心 */}
        <div className="relative mb-10 rounded-3xl px-6 py-10"
          style={{
            background: `
              linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.3) 50%, rgba(240,235,228,0.4) 100%)
            `,
            boxShadow: `
              0 0 0 1px rgba(212,169,154,0.15),
              0 8px 40px rgba(180,150,130,0.08),
              inset 0 1px 0 rgba(255,255,255,0.6)
            `
          }}
        >
          {/* 微光反射线 */}
          <div className="pointer-events-none absolute inset-x-8 top-4 h-[1px]"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 20%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.4) 80%, transparent 100%)"
            }}
          />
          {/* 底部反射 */}
          <div className="pointer-events-none absolute inset-x-0 -bottom-2 flex justify-center opacity-[0.03] select-none text-6xl leading-none scale-y-[-1] text-[#3a2e28]"
            aria-hidden="true"
          >
            {quote.slice(0, 20)}
          </div>

          <p className="relative text-[19px] leading-relaxed text-[#3a2e28] tracking-wide">
            「{quote.replace(/^[「『"/]+|[」』"、]+$/gu, "")}」
          </p>
        </div>

        {/* 返还句 — 固定，不加字 */}
        <p className="mb-12 text-[16px] leading-relaxed text-[#8b7d73]">
          这就是你做的事。<br />
          你已经说出来了，你只是没听见。
        </p>

        {/* 继续 */}
        <button
          onClick={onDone}
          className="text-[13px] tracking-[0.2em] text-[#c4b8ad] transition-colors hover:text-[#8b7d73]"
        >
          继续
        </button>
      </div>
    </div>
  );
}
