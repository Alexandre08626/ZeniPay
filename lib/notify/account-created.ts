// Account-created notification (email + SMS).
//
// Calls the central Zenitech notify service, which sends a branded
// ZeniPay confirmation email and, when a phone number is given, a
// Twilio SMS. Best-effort by design: this helper NEVER throws, gives
// up after 6 s, and silently skips when NOTIFY_KEY is not configured,
// so it can be awaited right after a signup without risking the
// signup response.

const NOTIFY_URL = "https://zenitech.dev/api/notify/account-created";
const NOTIFY_TIMEOUT_MS = 6_000;

export type NotifyAccountCreatedOptions = {
  name?: string | null;
  email: string;
  phone?: string | null;
  accountLabel?: string;
  loginUrl?: string;
  channels?: Array<"email" | "sms">;
};

export async function notifyAccountCreated(opts: NotifyAccountCreatedOptions): Promise<void> {
  const key = process.env.NOTIFY_KEY;
  if (!key) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOTIFY_TIMEOUT_MS);
  try {
    const res = await fetch(NOTIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-notify-key": key },
      body: JSON.stringify({
        division: "zenipay",
        name: opts.name || "",
        email: opts.email,
        phone: opts.phone || "",
        loginUrl: opts.loginUrl || "https://zenipay.ca/login",
        ...(opts.accountLabel ? { accountLabel: opts.accountLabel } : {}),
        ...(opts.channels ? { channels: opts.channels } : {}),
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as
      | { success?: boolean; email?: boolean; sms?: boolean; errors?: unknown[] }
      | null;
    if (!res.ok || !data?.success) {
      console.warn("[notify/account-created] not delivered:", res.status, data?.errors ?? null);
    }
  } catch (e) {
    console.warn("[notify/account-created] failed:", e instanceof Error ? e.message : String(e));
  } finally {
    clearTimeout(timer);
  }
}
