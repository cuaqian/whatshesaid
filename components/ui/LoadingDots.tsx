export function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1 px-1 py-2" aria-label="正在输入">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400" />
    </span>
  );
}
