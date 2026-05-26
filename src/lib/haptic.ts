// Lightweight haptic helper. iOS Safari ignores navigator.vibrate; that's
// fine — calls are silent no-ops there.

type HapticIntent = "tap" | "success" | "warning" | "error";

const PATTERNS: Record<HapticIntent, number | number[]> = {
  tap: 10,
  success: [10, 30, 10],
  warning: [20, 30],
  error: [30, 60, 30],
};

let armed = true;

export function haptic(intent: HapticIntent = "tap"): void {
  if (!armed) return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function")
    return;
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }
  try {
    navigator.vibrate(PATTERNS[intent]);
  } catch {
    armed = false;
  }
}
