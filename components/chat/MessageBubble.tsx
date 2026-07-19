import type { UiMessage } from "@/types/message";

interface MessageBubbleProps {
  message: UiMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-[15px] leading-7 shadow-sm ${
          isUser
            ? "rounded-br-md bg-stone-900 text-stone-50"
            : "rounded-bl-md border border-stone-200 bg-white/85 text-stone-800"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
