/**
 * ZeniPay Rate Limiter — Supabase-backed (scales across Vercel instances)
 *
 * Uses zenipay_rate_limits table with TTL-based cleanup:
 *   - INSERT a row with TTL = window from now
 *   - COUNT rows in the window
 *   - If count < max => allowed
 *   - Auto-cleanup by Supabase TTL / periodic sweep
 *
 * Falls back to permissive mode if the table doesn't exist yet.
 */

import { getSupabaseAdmin } from "./supabase";

export async function rateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60_000,
): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const windowStart = new Date(Date.now() - windowMs).toISOString();

    // Try to insert a rate-limit row. Use the Supabase time bucketing.
    // Key format: "login:ip:2026-07-23T12:00" so each window has its own row.
    const bucketKey = `${key}:${Math.floor(Date.now() / windowMs)}`;

    const { error: insertError } = await supabase
      .from("zenipay_rate_limits")
      .insert({
        bucket_key: bucketKey,
        created_at: now,
        expires_at: new Date(Date.now() + windowMs).toISOString(),
      });

    // If table doesn't exist, fall back to permissive
    if (insertError && insertError.code === "42P01") {
      // "relation does not exist" — table hasn't been created yet
      return true;
    }

    if (insertError) {
      console.warn("[rate-limit] insert error:", insertError.message);
      return true; // permissive fallback on unexpected errors
    }

    // Count rows in this bucket
    const { count, error: countError } = await supabase
      .from("zenipay_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("bucket_key", bucketKey);

    if (countError) {
      console.warn("[rate-limit] count error:", countError.message);
      return true;
    }

    return (count ?? 0) <= maxRequests;
  } catch (err) {
    // Never block traffic due to rate limiter failure
    console.warn("[rate-limit] unexpected error:", err);
    return true;
  }
}