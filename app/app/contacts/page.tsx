// /app/contacts — dedicated beneficiary contacts page.
//
// Split from the Banking "Contacts" section so contacts get a
// first-class route in the sidebar. Uses the same
// /api/zenipay/banking-ops save_contact / delete_contact actions
// the wallets page uses — no new endpoint.

"use client";

import { useCallback, useEffect, useState } from "react";
import { BankingShell, BankingCard, BankingButton } from "../BankingShell";
import { banking, fmtDate } from "@/lib/design-system/banking-tokens";

const { color: C, fontWeight: FW, radius: R } = banking;

type ContactType = "domestic_ca" | "interac" | "us_ach" | "swift";

interface Contact {
  id: string;
  name: string;
  bank_name?: string;
  routing_number?: string;
  account_number?: string;
  swift?: string;
  swift_code?: string;
  contact_type?: string;
  created_at?: string;
}

function readMerchantId(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") || "";
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    const mid = readMerchantId();
    if (!mid) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/zenipay/banking-ops?merchant_id=${encodeURIComponent(mid)}`).then((res) => res.json());
      setContacts(r.contacts ?? []);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const post = async (action: string, body: Record<string, unknown> = {}) => {
    const mid = readMerchantId();
    await fetch("/api/zenipay/banking-ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, merchant_id: mid, ...body }),
    });
    await load();
  };

  const filtered = contacts.filter((c) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return `${c.name ?? ""} ${c.bank_name ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <BankingShell
      title="Contacts"
      subtitle={`${contacts.length} beneficiar${contacts.length === 1 ? "y" : "ies"}`}
      actions={
        <BankingButton variant="primary" size="sm" onClick={() => setAddOpen(true)}>
          + Add contact
        </BankingButton>
      }
    >
      <BankingCard style={{ padding: "14px 16px", marginBottom: 14 }}>
        <input
          placeholder="Search contacts by name or bank"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%", height: 36, padding: "0 12px",
            borderRadius: R.sm, border: `1px solid ${C.borderSoft}`,
            background: C.surfaceInset, color: C.textPrimary,
            fontSize: 13, outline: "none",
          }}
          aria-label="Search contacts"
        />
      </BankingCard>

      {err && (
        <div style={errBoxStyle}>
          Failed to load contacts: {err}
        </div>
      )}

      <BankingCard style={{ padding: 0 }}>
        {loading && contacts.length === 0 ? (
          <ContactsSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyContacts onAdd={() => setAddOpen(true)} hasAny={contacts.length > 0} />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Name", "Type", "Bank / target", "Account", "Added", ""].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const typeLabel = detectType(c);
                const target = detectTarget(c);
                const acct = detectAccount(c);
                return (
                  <tr key={c.id} style={{ borderTop: `1px solid ${C.borderSoft}` }}>
                    <td style={{ ...tdStyle, color: C.textPrimary, fontWeight: FW.bold }}>{c.name}</td>
                    <td style={tdStyle}>{typeLabel}</td>
                    <td style={tdStyle}>{target}</td>
                    <td style={{ ...tdStyle, fontFamily: banking.font.mono }}>{acct}</td>
                    <td style={tdStyle}>{c.created_at ? fmtDate(c.created_at) : "—"}</td>
                    <td style={{ ...tdStyle, textAlign: "right" as const, paddingRight: 16 }}>
                      <BankingButton
                        variant="ghost" size="sm"
                        onClick={() => {
                          if (confirm(`Delete "${c.name}"?`)) void post("delete_contact", { contact_id: c.id });
                        }}
                      >
                        Delete
                      </BankingButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </BankingCard>

      {addOpen && (
        <AddContactModal
          onClose={() => setAddOpen(false)}
          onSave={async (payload) => {
            await post("save_contact", payload);
            setAddOpen(false);
          }}
        />
      )}
    </BankingShell>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Add contact modal — same four-type UX as the BankingPage modal, rebuilt
// with banking tokens for consistency with the rest of /app/*.
// ───────────────────────────────────────────────────────────────────────────

function AddContactModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [type, setType] = useState<ContactType>("domestic_ca");
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [transit, setTransit] = useState("");
  const [account, setAccount] = useState("");
  const [interacEmail, setInteracEmail] = useState("");
  const [usRouting, setUsRouting] = useState("");
  const [usAccount, setUsAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [swift, setSwift] = useState("");
  const [iban, setIban] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit =
    name.trim().length >= 2 && (
      (type === "domestic_ca" && institution && transit && account) ||
      (type === "interac" && /.+@.+\..+/.test(interacEmail)) ||
      (type === "us_ach" && usRouting && usAccount) ||
      (type === "swift" && bankName && swift && iban)
    );

  const submit = async () => {
    let payload: Record<string, unknown> = { name: name.trim() };
    if (type === "domestic_ca") payload = { ...payload, bank_name: "", routing_number: `${institution}-${transit}`, account_number: account, swift: "", contact_type: "domestic" };
    else if (type === "interac") payload = { ...payload, bank_name: "Interac", routing_number: `interac:${interacEmail.trim()}`, account_number: "", swift: "", contact_type: "interac" };
    else if (type === "us_ach") payload = { ...payload, bank_name: "", routing_number: usRouting, account_number: usAccount, swift: "", contact_type: "us_ach" };
    else payload = { ...payload, bank_name: bankName, routing_number: "", account_number: iban, swift, contact_type: "international" };
    setSaving(true);
    try { await onSave(payload); } finally { setSaving(false); }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: banking.zIndex.modal, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.surfaceElevated, borderRadius: R.lg, width: "100%", maxWidth: 560, maxHeight: "92vh", overflow: "auto", boxShadow: banking.shadow.lg }}
      >
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.borderSoft}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: FW.black, fontSize: 18, color: C.textPrimary }}>Add beneficiary contact</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textMuted }}>
              Save recipients once, then send money in a click.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            background: "transparent", border: "none", fontSize: 20,
            color: C.textMuted, cursor: "pointer",
          }}>×</button>
        </div>

        <div style={{ padding: 22 }}>
          <Label>Recipient name</Label>
          <Input value={name} onChange={setName} placeholder="e.g. Dubai Supplier Co." />

          <Label style={{ marginTop: 18 }}>Transfer type</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {([
              { id: "domestic_ca", label: "🇨🇦 Domestic (CA)", desc: "Institution + transit + account" },
              { id: "interac",     label: "💌 Interac",         desc: "Send by email" },
              { id: "us_ach",      label: "🇺🇸 US ACH",          desc: "Routing + account" },
              { id: "swift",       label: "🌐 SWIFT",            desc: "Bank + SWIFT + IBAN" },
            ] as Array<{ id: ContactType; label: string; desc: string }>).map((opt) => {
              const active = type === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setType(opt.id)}
                  style={{
                    padding: "10px 12px", borderRadius: R.md, cursor: "pointer",
                    textAlign: "left" as const,
                    border: `1.5px solid ${active ? C.accountPrimary : C.borderSoft}`,
                    background: active ? "rgba(15,79,63,0.05)" : C.surfaceInset,
                  }}
                >
                  <div style={{ fontWeight: FW.bold, fontSize: 13, color: C.textPrimary }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{opt.desc}</div>
                </button>
              );
            })}
          </div>

          {type === "domestic_ca" && (
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><Label>Institution # (3 digits)</Label><Input value={institution} onChange={setInstitution} placeholder="001" maxLength={3} /></div>
              <div><Label>Transit # (5 digits)</Label><Input value={transit} onChange={setTransit} placeholder="12345" maxLength={5} /></div>
              <div style={{ gridColumn: "1 / -1" }}><Label>Account number</Label><Input value={account} onChange={setAccount} placeholder="1234567" /></div>
            </div>
          )}
          {type === "interac" && (
            <div style={{ marginTop: 16 }}>
              <Label>Recipient email</Label>
              <Input value={interacEmail} onChange={setInteracEmail} placeholder="recipient@email.com" type="email" />
            </div>
          )}
          {type === "us_ach" && (
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><Label>Routing (ABA, 9 digits)</Label><Input value={usRouting} onChange={setUsRouting} placeholder="021000021" maxLength={9} /></div>
              <div><Label>Account number</Label><Input value={usAccount} onChange={setUsAccount} placeholder="Account #" /></div>
            </div>
          )}
          {type === "swift" && (
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}><Label>Bank name</Label><Input value={bankName} onChange={setBankName} placeholder="e.g. HSBC UK" /></div>
              <div><Label>SWIFT / BIC</Label><Input value={swift} onChange={setSwift} placeholder="HBUKGB4B" /></div>
              <div><Label>IBAN or account</Label><Input value={iban} onChange={setIban} placeholder="GB29NWBK60161331926819" /></div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <BankingButton variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </BankingButton>
            <BankingButton
              variant="primary" size="md"
              onClick={submit}
              disabled={!canSubmit || saving}
              style={{ flex: 1 }}
            >
              {saving ? "Saving…" : "Save contact"}
            </BankingButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers + primitives
// ───────────────────────────────────────────────────────────────────────────

function detectType(c: Contact): string {
  if (c.swift || c.swift_code) return "SWIFT";
  if ((c.routing_number ?? "").startsWith("interac:")) return "Interac";
  if ((c.routing_number ?? "").includes("-")) return "Domestic CA";
  if (c.routing_number && c.routing_number.length >= 9) return "US ACH";
  return "Unknown";
}
function detectTarget(c: Contact): string {
  if (c.swift || c.swift_code) return `${c.bank_name || "Bank"} · ${c.swift || c.swift_code}`;
  if ((c.routing_number ?? "").startsWith("interac:")) return (c.routing_number || "").replace("interac:", "");
  if (c.bank_name) return c.bank_name;
  return c.routing_number || "—";
}
function detectAccount(c: Contact): string {
  if (!c.account_number) return "—";
  return `••${c.account_number.slice(-4)}`;
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{
      display: "block", fontSize: 10, fontWeight: FW.bold,
      color: C.textMuted, letterSpacing: "0.1em",
      textTransform: "uppercase", marginBottom: 6,
      ...style,
    }}>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder, maxLength, type = "text" }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      style={{
        width: "100%", padding: "11px 14px",
        borderRadius: R.sm, border: `1px solid ${C.borderSoft}`,
        background: C.surfaceInset, color: C.textPrimary, fontSize: 14,
        boxSizing: "border-box", outline: "none",
        fontFamily: banking.font.sans,
      }}
    />
  );
}

function ContactsSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 16, padding: "14px 0", borderBottom: i < 3 ? `1px solid ${C.borderSoft}` : "none" }}>
          <div style={{ width: 120, height: 14, background: C.surfaceInset, borderRadius: 4 }} />
          <div style={{ width: 100, height: 14, background: C.surfaceInset, borderRadius: 4 }} />
          <div style={{ flex: 1, height: 14, background: C.surfaceInset, borderRadius: 4 }} />
          <div style={{ width: 60, height: 14, background: C.surfaceInset, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

function EmptyContacts({ onAdd, hasAny }: { onAdd: () => void; hasAny: boolean }) {
  return (
    <div style={{ padding: "56px 24px", textAlign: "center" as const }}>
      <div style={{ fontSize: 44 }}>👥</div>
      <p style={{ margin: "10px 0 4px", fontWeight: FW.bold, fontSize: 15, color: C.textPrimary }}>
        {hasAny ? "No matching contacts" : "No beneficiaries yet"}
      </p>
      <p style={{ margin: "0 0 18px", color: C.textMuted, fontSize: 13 }}>
        {hasAny
          ? "Try a different search term."
          : "Add your first beneficiary to speed up future transfers."}
      </p>
      {!hasAny && (
        <BankingButton variant="primary" onClick={onAdd}>
          + Add your first contact
        </BankingButton>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left" as const, padding: "12px 20px", fontSize: 10, fontWeight: FW.bold,
  color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase",
  background: C.surfaceInset,
};
const tdStyle: React.CSSProperties = {
  padding: "12px 20px", fontSize: 13, color: C.textSecondary,
};
const errBoxStyle: React.CSSProperties = {
  padding: "12px 16px", borderRadius: 12, marginBottom: 14,
  background: C.disputedBg, border: `1px solid ${C.disputed}33`,
  color: C.disputed, fontSize: 13, fontWeight: FW.bold,
};
