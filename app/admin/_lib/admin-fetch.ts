// Helper for /admin/* pages to call admin-only endpoints.
// Pulls the operator email from sessionStorage and attaches it as
// the x-admin-email header (matches /api/v1/admin/* convention).

export function adminEmail(): string {
  if (typeof window === "undefined") return "";
  return (sessionStorage.getItem("zp_client_email") || "").trim().toLowerCase();
}

export async function adminFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const email = adminEmail();
  if (email) headers.set("x-admin-email", email);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(path, { ...init, headers, cache: "no-store" });
  const text = await res.text();
  let data: unknown;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    throw new Error(`${res.status}: ${(data as { error?: string }).error ?? text.slice(0, 200)}`);
  }
  return data as T;
}
