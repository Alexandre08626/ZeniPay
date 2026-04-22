// Browser-side session helpers for the Agents dashboard (Phase 1).
// Stores org id + email in sessionStorage. Every dashboard API call sends
// the org id as x-zp-agents-org. Full Supabase Auth integration lands later.

const ORG_KEY = "zp_agents_org";
const EMAIL_KEY = "zp_agents_email";
const USER_ID_KEY = "zp_agents_user_id";

export interface AgentsSession {
  organizationId: string;
  email: string;
  userId?: string;
}

export function readSession(): AgentsSession | null {
  if (typeof window === "undefined") return null;
  try {
    const organizationId = sessionStorage.getItem(ORG_KEY);
    const email = sessionStorage.getItem(EMAIL_KEY);
    const userId = sessionStorage.getItem(USER_ID_KEY) ?? undefined;
    if (!organizationId || !email) return null;
    return { organizationId, email, userId };
  } catch {
    return null;
  }
}

export function writeSession(s: AgentsSession): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ORG_KEY, s.organizationId);
    sessionStorage.setItem(EMAIL_KEY, s.email);
    if (s.userId) sessionStorage.setItem(USER_ID_KEY, s.userId);
  } catch {
    /* ignore */
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ORG_KEY);
    sessionStorage.removeItem(EMAIL_KEY);
    sessionStorage.removeItem(USER_ID_KEY);
  } catch {
    /* ignore */
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const s = readSession();
  const headers = new Headers(init.headers);
  if (s) {
    headers.set("x-zp-agents-org", s.organizationId);
    if (s.userId) headers.set("x-zp-agents-user", s.userId);
  }
  headers.set("content-type", "application/json");
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const raw = await res.text();
    // Prefer the structured shape { error: { code, message } } used by the
    // accounting routes; fall back to raw text for older routes.
    let msg = raw;
    try {
      const parsed = JSON.parse(raw) as { error?: string | { code?: string; message?: string } };
      if (typeof parsed.error === "string") msg = parsed.error;
      else if (parsed.error && typeof parsed.error === "object" && parsed.error.message) {
        msg = parsed.error.message;
      }
    } catch { /* not JSON, keep raw */ }
    throw new Error(`${res.status} ${msg}`);
  }
  return (await res.json()) as T;
}
