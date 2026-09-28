import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest, NextResponse } from "next/server";

beforeAll(() => { process.env.ZP_SESSION_SECRET = "test-secret-0123456789abcdef0123456789"; });

async function mod() { return import("@/lib/auth/zp-session"); }
const reqWith = (cookie: string) => new NextRequest("https://zenipay.ca/x", { headers: { cookie } });
const cookieOf = (res: NextResponse, name: string) => res.cookies.get(name)?.value || "";

describe("account switcher cookies", () => {
  it("remembers each signed-in account; forged/foreign tokens are ignored", async () => {
    const { rememberAccount, readRememberedAccounts, signZpSession } = await mod();
    const r1 = NextResponse.json({});
    rememberAccount(reqWith(""), r1, "zenicorp", "live");
    const c1 = cookieOf(r1, "zp_accounts");
    const r2 = NextResponse.json({});
    rememberAccount(reqWith(`zp_accounts=${c1}`), r2, "zenitech", "live");
    const c2 = cookieOf(r2, "zp_accounts");
    expect(readRememberedAccounts(reqWith(`zp_accounts=${c2}`)).map((a) => a.merchant_id).sort()).toEqual(["zenicorp", "zenitech"]);

    // A token for another merchant that was never signed in here, tampered in by hand:
    const forged = Buffer.from(JSON.stringify({ mid: "victim", iat: 1, exp: 9e9 })).toString("base64url") + ".AAAA";
    const list = readRememberedAccounts(reqWith(`zp_accounts=${c2}~${forged}`)).map((a) => a.merchant_id);
    expect(list).not.toContain("victim");
    expect(signZpSession("x")).toBeTruthy();
  });

  it("activating clears the Supabase cookies and sets the HMAC session", async () => {
    const { activateAccount } = await mod();
    const res = NextResponse.json({});
    activateAccount(res, "zenitech", "live");
    expect(cookieOf(res, "zp_session")).toMatch(/\./);
    expect(res.cookies.get("sb-access-token")?.value).toBe("");
  });
});
