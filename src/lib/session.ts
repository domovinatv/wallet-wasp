// Client-side session marker. We persist just userId + safeAddr so the
// UI can show the user's wallet without re-querying the server every
// page load. NOT a security boundary: server-side trust comes from the
// JWT cookie / future HTTP-only session token.

const KEY = "wallet-wasp:session";

export interface ClientSession {
  userId: string;
  safeAddr: string;
}

export function setSession(s: ClientSession) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function getSession(): ClientSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ClientSession) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
