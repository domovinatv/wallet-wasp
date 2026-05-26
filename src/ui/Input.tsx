import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn.js";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  mono?: boolean;
}

export function Input({
  label,
  hint,
  error,
  mono,
  className,
  ...rest
}: InputProps) {
  return (
    <label className="block">
      <span className="block text-xs font-medium uppercase tracking-wider text-ink-soft">
        {label}
      </span>
      <input
        {...rest}
        className={cn(
          "mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-3 text-base",
          "outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15",
          error ? "border-accent" : "border-border",
          mono && "mono text-sm",
          className,
        )}
      />
      {(error || hint) && (
        <span
          className={cn(
            "mt-1.5 block text-xs",
            error ? "text-accent" : "text-ink-soft",
          )}
        >
          {error || hint}
        </span>
      )}
    </label>
  );
}
