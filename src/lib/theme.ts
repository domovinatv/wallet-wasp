// Light/dark theme persistence + system preference reaction.
import { useEffect, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";
const VALID_MODES: ThemeMode[] = ["system", "light", "dark"];

function readStored(): ThemeMode {
  if (typeof localStorage === "undefined") return "system";
  const raw = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  return raw && VALID_MODES.includes(raw) ? raw : "system";
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyResolved(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  (document.documentElement.style as CSSStyleDeclaration & { colorScheme: string }).colorScheme =
    resolved;
}

// Apply at module load (before React mounts) to avoid flash.
if (typeof document !== "undefined") {
  applyResolved(resolveTheme(readStored()));
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => readStored());
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolveTheme(readStored()),
  );

  useEffect(() => {
    applyResolved(resolved);
  }, [resolved]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolved(mq.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  function setMode(next: ThemeMode) {
    setModeState(next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, next);
    }
    setResolved(resolveTheme(next));
  }

  function cycle() {
    const idx = VALID_MODES.indexOf(mode);
    setMode(VALID_MODES[(idx + 1) % VALID_MODES.length]);
  }

  return { mode, resolved, setMode, cycle };
}
