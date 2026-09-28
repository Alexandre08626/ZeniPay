import { describe, it, expect, vi } from "vitest";
const sent: any[] = [];
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn(async (m: any) => { sent.push(m); }) }));
import { requestPasswordReset, completePasswordReset } from "@/lib/zenipay/password-reset";
import { verifyPassword } from "@/modules/zenipay/services/auth";

function db(rows: any[]) {
  return {
    auth: { admin: { listUsers: async () => ({ data: { users: [] } }), updateUserById: async () => ({}) } },
    from: () => {
      const st: any = { f: [] };
      const api: any = {
        select: () => api, maybeSingle: () => { st.single = true; return api; },
        eq: (k: string, v: any) => { st.f.push([k, v]); return api; },
        update: (p: any) => { st.patch = p; return api; },
        then: (res: any) => {
          const m = rows.filter((r) => st.f.every(([k, v]: any) => r[k] === v));
          if (st.patch) { m.forEach((r) => Object.assign(r, st.patch)); return res({ error: null }); }
          return res({ data: st.single ? m[0] ?? null : m, error: null });
        },
      };
      return api;
    },
  } as any;
}

describe("password reset", () => {
  it("emails a single-use link and sets a hashed password", async () => {
    const rows = [{ id: "z", email: "info@zenitech.dev", config: { businessName: "Zenitech", keep: 1 } }];
    const d = db(rows);
    await requestPasswordReset(d, "INFO@zenitech.dev", "https://zenipay.ca");
    expect(sent[0].to).toBe("info@zenitech.dev");
    const token = /token=([\w-]+)/.exec(sent[0].html)![1];
    expect(rows[0].config).toHaveProperty("pw_reset");
    expect(JSON.stringify(rows[0].config)).not.toContain(token); // only the hash is stored

    expect(await completePasswordReset(d, token, "short")).toMatchObject({ ok: false });
    expect(await completePasswordReset(d, token, "NouveauMotDePasse!")).toEqual({ ok: true });
    const cfg: any = rows[0].config;
    expect(cfg.keep).toBe(1);
    expect(cfg.pw_reset).toBeUndefined();
    expect(cfg.password).not.toBe("NouveauMotDePasse!");
    expect(await verifyPassword("NouveauMotDePasse!", cfg.password)).toBe(true);
    expect(await completePasswordReset(d, token, "EncoreUnAutre123")).toMatchObject({ ok: false }); // single use
  });

  it("does nothing (and doesn't reveal it) for an unknown email", async () => {
    sent.length = 0;
    await requestPasswordReset(db([]), "nobody@x.ca", "https://zenipay.ca");
    expect(sent).toHaveLength(0);
  });
});
