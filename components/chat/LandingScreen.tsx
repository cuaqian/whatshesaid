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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f5f0ea] px-6 sm:px-10 overflow-y-auto">
      {/* 镜面背景 */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 50% 32% at 50% 35%, rgba(255,255,255,0.65) 0%, transparent 65%),
            radial-gradient(ellipse 65% 35% at 50% 58%, rgba(212,169,154,0.04) 0%, transparent 50%)
          `
        }}
      />

      {/* 主内容 */}
      <div className={`relative z-10 flex w-full max-w-xs sm:max-w-sm flex-col items-center text-center py-12 transition-all duration-[1.4s] ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}>
        {/* 顶部标识 */}
        <p className="mb-3 text-[11px] sm:text-xs tracking-[0.35em] text-[#c4b8ad]">
          WHAT SHE SAID
        </p>
        <h1 className="mb-16 sm:mb-20 text-[36px] sm:text-[40px] font-light tracking-[0.12em] text-[#3a2e28]">
          她说过
        </h1>

        {/* 核心信息卡 */}
        <div className="relative mb-10 sm:mb-12 w-full rounded-3xl px-8 sm:px-10 py-10 sm:py-12"
          style={{
            background: `
              linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 50%, rgba(240,235,228,0.3) 100%)
            `,
            boxShadow: `
              0 0 0 1px rgba(212,169,154,0.12),
              0 8px 36px rgba(180,150,130,0.06),
              inset 0 1px 0 rgba(255,255,255,0.5)
            `
          }}
        >
          <div className="pointer-events-none absolute inset-x-6 sm:inset-x-8 top-3 h-[1px]"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 30%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.35) 70%, transparent 100%)"
            }}
          />

          <p className="mb-6 text-[15px] sm:text-base leading-relaxed text-[#8b7d73]">
            问几个问题。把你脱口而出、<br />
            却从没认真听过的<br />
            <span className="text-[#3a2e28] font-medium">那句话</span>，原样还给你。
          </p>

          <div className="mx-auto w-12 border-t border-[#e8ddd1]" />

          <p className="mt-5 text-[13px] sm:text-sm leading-relaxed text-[#b5a99f]">
            不听你评价自己。<br />
            不替你命名。<br />
            不生成报告。
          </p>
        </div>

        {/* 底部说明 */}
        <p className="mb-10 sm:mb-12 text-[12px] sm:text-[13px] tracking-[0.15em] text-[#c4b8ad]">
          一面镜子，只映你说过的话
        </p>

        {/* 开始按钮 */}
        <button
          onClick={onStart}
          className="inline-flex items-center gap-2 rounded-full border border-[#d4c8bb] px-10 py-3.5 text-[15px] tracking-[0.12em] text-[#8b7d73] transition-all duration-500 hover:border-[#d4a99a] hover:text-[#3a2e28] hover:bg-white/40 active:scale-[0.98]"
        >
          开始
        </button>
      </div>
    </div>
  );
}
