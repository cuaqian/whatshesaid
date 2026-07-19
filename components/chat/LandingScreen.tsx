"use client";

import { useEffect, useState } from "react";

interface Props {
  onStart: () => void;
}

export function LandingScreen({ onStart }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f5f0ea] px-6">
      {/* 镜面背景 */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 50% 35% at 50% 38%, rgba(255,255,255,0.7) 0%, transparent 70%),
            radial-gradient(ellipse 70% 40% at 50% 52%, rgba(212,169,154,0.04) 0%, transparent 50%)
          `
        }}
      />
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.1) 40%, transparent 70%)"
        }}
      />

      {/* 主内容 */}
      <div className={`relative z-10 max-w-xs text-center transition-all duration-[1.4s] ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}>
        {/* 产品名 */}
        <p className="mb-3 text-[12px] tracking-[0.35em] text-[#c4b8ad]">
          WHAT SHE SAID
        </p>
        <h1 className="mb-10 text-[32px] font-light tracking-[0.15em] text-[#3a2e28]">
          她说过
        </h1>

        {/* 镜面卡片 */}
        <div className="relative mb-12 rounded-3xl px-8 py-10"
          style={{
            background: `
              linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.25) 50%, rgba(240,235,228,0.35) 100%)
            `,
            boxShadow: `
              0 0 0 1px rgba(212,169,154,0.12),
              0 8px 36px rgba(180,150,130,0.06),
              inset 0 1px 0 rgba(255,255,255,0.5)
            `
          }}
        >
          {/* 微光 */}
          <div className="pointer-events-none absolute inset-x-6 top-3 h-[1px]"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 30%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.35) 70%, transparent 100%)"
            }}
          />

          <p className="text-[14px] leading-relaxed text-[#8b7d73]">
            一个帮女性看见自己价值的东西。
            <br />
            <span className="text-[#b5a99f]">不问你有多厉害，只想听你讲一件做过的事。</span>
          </p>
        </div>

        {/* 入口按钮 — 克制，不炫 */}
        <button
          onClick={onStart}
          className="inline-flex items-center gap-2 rounded-full border border-[#d4c8bb] px-8 py-3 text-[14px] tracking-[0.15em] text-[#8b7d73] transition-all duration-500 hover:border-[#d4a99a] hover:text-[#3a2e28] hover:bg-white/40 active:scale-[0.98]"
        >
          <span>进入</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
