"use client";

import { useCallback, useRef, useState } from "react";

interface Props {
  disabled: boolean;
  ended: boolean;
  onSend: (content: string) => void;
}

// 浏览器原生语音识别，免费，HTTPS 下可用
const SpeechRecognition =
  (typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null);

export function ChatInput({ disabled, onSend }: Props) {
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState("");
  const recognitionRef = useRef<any>(null);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setMicError("当前浏览器不支持语音输入，请用 Chrome 或 Edge");
      setTimeout(() => setMicError(""), 3000);
      return;
    }

    setMicError("");

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      // interimResults 模式下边走边显示
      let finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        finalText += event.results[i][0].transcript;
      }
      setValue((prev) => (prev ? prev + finalText : finalText));
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setMicError("请允许麦克风权限后重试");
      } else if (event.error === "no-speech") {
        setMicError("没听到声音，请再试一次");
      } else {
        setMicError("语音识别出错，请打字输入");
      }
      setTimeout(() => setMicError(""), 3000);
      stopListening();
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setMicError("语音启动失败，请用 Chrome 打开");
      setTimeout(() => setMicError(""), 3000);
    }
  }, [stopListening]);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    setValue("");
    onSend(trimmed);
  }

  const hasSpeechSupport = !!SpeechRecognition;

  return (
    <div className="border-t border-[#e8ddd1] bg-[#faf5ee] px-4 py-4">
      <div className="flex items-end gap-2 rounded-2xl bg-white/80 px-4 py-2 shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-1 focus-within:ring-[#d4a99a]/30">
        {/* 语音按钮 */}
        {hasSpeechSupport && (
          <button
            disabled={disabled}
            onClick={listening ? stopListening : startListening}
            className={`mb-1 shrink-0 rounded-full p-1.5 transition-all active:scale-90 ${
              listening
                ? "animate-pulse text-red-400"
                : "text-[#c4b8ad] hover:text-[#d4a99a]"
            } disabled:text-[#e0d5ca]`}
            aria-label={listening ? "停止录音" : "语音输入"}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        )}

        <textarea
          className="max-h-28 min-h-[40px] flex-1 resize-none border-0 bg-transparent py-1.5 text-[15px] leading-relaxed text-[#3a2e28] placeholder-[#c4b8ad] outline-none"
          placeholder={listening ? "正在听……" : "打字或语音说话"}
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
      {micError && (
        <p className="mt-1.5 text-center text-xs text-red-400">{micError}</p>
      )}
    </div>
  );
}
