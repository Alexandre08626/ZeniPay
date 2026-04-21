// Browser-side session helpers for the Agents dashboard (Phase 1).
// Stores org id + email in sessionStorage. Every dashboard API call sends
// the org id as x-zp-agents-org. Full Supabase Auth integration lands later.

const ORG_KEY = "zp_agents_org";
const EMAIL_KEY = "zp_agents_email";

export interface AgentsSession {
  organizationId: string;
  email: string;
}

export function readSession(): AgentsSession | null {
  if (typeof window === "undefined") return null;
  try {
    const organizationId = sessionStorage.getItem(ORG_KEY);
    const email = sessionStorage.getItem(EMAIL_KEY);
    if (!organizationId || !email) return null;
    return { organizationId, email };
  } catch {
    return null;
  }
}

export function writeSession(s: AgentsSession): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ORG_KEY, s.organizationId);
    sessionStorage.setItem(EMAIL_KEY, s.email);
  } catch {
    /* ignore */
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ORG_KEY);
    sessionStorage.removeItem(EMAIL_KEY);
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
  if (s) headers.set("x-zp-agents-org", s.organizationId);
  headers.set("content-type", "application/json");
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return (await res.json()) as T;
}
