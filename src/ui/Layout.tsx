import type { ReactNode } from "react";
import { Link } from "react-router";
import { brand } from "../brand.config.js";
import { cn } from "./cn.js";

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  back?: { to: string; label: string };
  title?: string;
  className?: string;
}

export function Layout({
  children,
  showHeader = true,
  back,
  title,
  className,
}: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {showHeader && (
        <header className="safe-px sticky top-0 z-10 border-b border-border/60 bg-bg/85 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center justify-between">
            {back ? (
              <Link
                to={back.to}
                className="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-ink-muted hover:bg-ink/5"
              >
                <BackArrow />
                <span>{back.label}</span>
              </Link>
            ) : (
              <Link to="/" className="flex items-center gap-2">
                <Logo />
                <span className="font-semibold tracking-tight">
                  {brand.name.toLowerCase()}
                  <span className="text-ink-muted"> wallet</span>
                </span>
              </Link>
            )}
            {title && (
              <span className="text-sm font-medium text-ink-muted">{title}</span>
            )}
            <span className="w-12" />
          </div>
        </header>
      )}
      <main className={cn("safe-px mx-auto w-full max-w-md flex-1 px-4 py-6", className)}>
        {children}
      </main>
    </div>
  );
}

function BackArrow() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <path
        d="M12 5l-5 5 5 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Logo() {
  return (
    <span
      className="grid h-7 w-7 place-items-center rounded-lg text-white"
      style={{
        background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.primaryColor}cc)`,
      }}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
        <path d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm2 2v4h2V6H4Zm4 0v4h2V8h2v2h-2v-2H8Zm6 0h-2v4h2V6Z" />
      </svg>
    </span>
  );
}
