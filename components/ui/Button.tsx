import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

export function Button({ children, className = "", variant = "primary", ...props }: ButtonProps) {
  const base = "rounded-full px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-stone-900 text-stone-50 active:bg-stone-700",
    ghost: "border border-stone-300 bg-white/70 text-stone-700 active:bg-stone-100"
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
