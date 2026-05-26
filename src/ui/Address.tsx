import { useState } from "react";
import { cn } from "./cn.js";

interface AddressProps {
  value: string;
  truncate?: boolean;
  className?: string;
}

export function Address({ value, truncate, className }: AddressProps) {
  const [copied, setCopied] = useState(false);

  const display = truncate
    ? `${value.slice(0, 6)}…${value.slice(-4)}`
    : value;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(
        "mono inline-flex items-center gap-1.5 rounded-md bg-ink/5 px-1.5 py-0.5 text-xs text-ink-muted transition hover:bg-ink/10",
        className,
      )}
      title={copied ? "Copied" : "Click to copy"}
    >
      <span>{display}</span>
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
      <rect x="4.5" y="4.5" width="9" height="9" rx="1.5" stroke="currentColor" />
      <path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H11" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
      <path
        d="M3 8.5l3 3 7-7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
