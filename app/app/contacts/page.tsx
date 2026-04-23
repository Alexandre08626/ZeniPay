// /app/contacts — dedicated beneficiary contacts page on the new shell.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";

type ContactType = "domestic_ca" | "interac" | "us_ach" | "swift";

interface Contact {
  id: string;
  name: string;
  bank_name?: string;
  routing_number?: string;
  account_number?: string;
  swift?: string;
  contact_type?: string;
  created_at?: string;
}

function mid() { return typeof window === "undefined" ? "" : sessionStorage.getItem("zp_client") || ""; }

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    if (!mid()) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/zenipay/banking-ops?merchant_id=${encodeURIComponent(mid())}`).then((x) => x.json());
      setContacts(r.contacts ?? []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const post = async (action: string, body: Record<string, unknown> = {}) => {
    await fetch("/api/zenipay/banking-ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, merchant_id: mid(), ...body }),
    });
    await load();
  };

  const filtered = contacts.filter((c) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return `${c.name ?? ""} ${c.bank_name ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <DashboardShell mode="merchant">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{
            margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em",
            fontWeight: zp.weight.semibold, color: zp.text.primary,
          }}>Contacts</h1>
          <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>
            {contacts.length} beneficiar{contacts.length === 1 ? "y" : "ies"}
          </p>
        </div>
        <GradientButton variant="primary" size="md" onClick={() => setAddOpen(true)} icon={<Plus size={14} />}>
          Add contact
        </GradientButton>
      </div>

      <BankingCard padding={14} style={{ marginBottom: 14 }}>
        <input
          placeholder="Search contacts by name or bank"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%", height: 36, padding: "0 12px",
            borderRadius: zp.radius.sm, border: `1px solid ${zp.surface.border}`,
            background: zp.surface.bg2, color: zp.text.primary, fontSize: 13,
            outline: "none", boxSizing: "border-box", fontFamily: zp.font.sans,
          }}
        />
      </BankingCard>

      <BankingCard padding="none">
        <DataTable
          rows={filtered}
          loading={loading && contacts.length === 0}
          rowKey={(c) => c.id}
          columns={[
            { key: "name", header: "Name", cell: (c) => <span style={{ color: zp.text.primary, fontWeight: zp.weight.semibold }}>{c.name}</span> },
            { key: "type", header: "Type", cell: (c) => detectType(c), width: 140 },
            { key: "target", header: "Bank / target", cell: (c) => detectTarget(c) },
            { key: "acct", header: "Account", cell: (c) => detectAccount(c), mono: true, width: 140 },
            { key: "added", header: "Added", cell: (c) => c.created_at ? zp.fmtDate(c.created_at) : "—", width: 130 },
            {
              key: "act", header: "", align: "right", width: 100,
              cell: (c) => (
                <GradientButton
                  variant="ghost" size="sm" icon={<Trash2 size={12} />}
                  onClick={() => { if (confirm(`Delete "${c.name}"?`)) void post("delete_contact", { contact_id: c.id }); }}
                >Delete</GradientButton>
              ),
            },
          ]}
          empty={
            <div>
              <p style={{ margin: "0 0 10px", color: zp.text.primary, fontWeight: zp.weight.semibold }}>No contacts yet</p>
              <GradientButton variant="primary" size="md" onClick={() => setAddOpen(true)}>Add your first contact</GradientButton>
            </div>
          }
        />
      </BankingCard>

      {addOpen && (
        <AddContactModal
          onClose={() => setAddOpen(false)}
          onSave={async (payload) => { await post("save_contact", payload); setAddOpen(false); }}
        />
      )}
    </DashboardShell>
  );
}

function AddContactModal({ onClose, onSave }: { onClose: () => void; onSave: (payload: Record<string, unknown>) => Promise<void> }) {
  const [type, setType] = useState<ContactType>("domestic_ca");
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState(""); const [transit, setTransit] = useState(""); const [account, setAccount] = useState("");
  const [interacEmail, setInteracEmail] = useState("");
  const [usRouting, setUsRouting] = useState(""); const [usAccount, setUsAccount] = useState("");
  const [bankName, setBankName] = useState(""); const [swift, setSwift] = useState(""); const [iban, setIban] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = name.trim().length >= 2 && (
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
      style={{ position: "fixed", inset: 0, background: zp.surface.overlay, backdropFilter: "blur(6px)", zIndex: zp.zIndex.modal, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: zp.surface.bg1, borderRadius: zp.radius.lg, width: "100%", maxWidth: 560, maxHeight: "92vh", overflow: "auto", boxShadow: zp.elevation.lg }}
      >
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${zp.surface.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: zp.weight.semibold, fontSize: 18, color: zp.text.primary }}>Add beneficiary contact</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: zp.text.muted }}>Save recipients once, then send money in a click.</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", fontSize: 20, color: zp.text.muted, cursor: "pointer" }}>×</button>
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
                    padding: "10px 12px", borderRadius: zp.radius.md, cursor: "pointer", textAlign: "left" as const,
                    border: `1.5px solid ${active ? zp.brand.cyan : zp.surface.border}`,
                    background: active ? "rgba(21,184,201,0.06)" : zp.surface.bg2,
                  }}
                >
                  <div style={{ fontWeight: zp.weight.semibold, fontSize: 13, color: zp.text.primary }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 2 }}>{opt.desc}</div>
                </button>
              );
            })}
          </div>

          {type === "domestic_ca" && (
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><Label>Institution (3 digits)</Label><Input value={institution} onChange={setInstitution} placeholder="001" maxLength={3} /></div>
              <div><Label>Transit (5 digits)</Label><Input value={transit} onChange={setTransit} placeholder="12345" maxLength={5} /></div>
              <div style={{ gridColumn: "1 / -1" }}><Label>Account number</Label><Input value={account} onChange={setAccount} placeholder="1234567" /></div>
            </div>
          )}
          {type === "interac" && (
            <div style={{ marginTop: 16 }}>
              <Label>Recipient email</Label><Input value={interacEmail} onChange={setInteracEmail} placeholder="recipient@email.com" type="email" />
            </div>
          )}
          {type === "us_ach" && (
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><Label>Routing (ABA)</Label><Input value={usRouting} onChange={setUsRouting} placeholder="021000021" maxLength={9} /></div>
              <div><Label>Account number</Label><Input value={usAccount} onChange={setUsAccount} placeholder="Account #" /></div>
            </div>
          )}
          {type === "swift" && (
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}><Label>Bank name</Label><Input value={bankName} onChange={setBankName} placeholder="HSBC UK" /></div>
              <div><Label>SWIFT / BIC</Label><Input value={swift} onChange={setSwift} placeholder="HBUKGB4B" /></div>
              <div><Label>IBAN / Account</Label><Input value={iban} onChange={setIban} placeholder="GB29NWBK60161331926819" /></div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <GradientButton variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>Cancel</GradientButton>
            <GradientButton variant="primary" size="md" onClick={submit} disabled={!canSubmit || saving} style={{ flex: 1 }}>
              {saving ? "Saving…" : "Save contact"}
            </GradientButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function detectType(c: Contact): string {
  if (c.swift) return "SWIFT";
  if ((c.routing_number ?? "").startsWith("interac:")) return "Interac";
  if ((c.routing_number ?? "").includes("-")) return "Domestic CA";
  if (c.routing_number && c.routing_number.length >= 9) return "US ACH";
  return "—";
}
function detectTarget(c: Contact): string {
  if (c.swift) return `${c.bank_name || "Bank"} · ${c.swift}`;
  if ((c.routing_number ?? "").startsWith("interac:")) return (c.routing_number || "").replace("interac:", "");
  return c.bank_name || c.routing_number || "—";
}
function detectAccount(c: Contact): string {
  if (!c.account_number) return "—";
  return `••${c.account_number.slice(-4)}`;
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{
      display: "block", fontSize: 10, fontWeight: zp.weight.semibold,
      color: zp.text.muted, letterSpacing: "0.1em",
      textTransform: "uppercase" as const, marginBottom: 6, ...style,
    }}>{children}</label>
  );
}
function Input({ value, onChange, placeholder, maxLength, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number; type?: string;
}) {
  return (
    <input
      type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} maxLength={maxLength}
      style={{
        width: "100%", padding: "11px 14px", borderRadius: zp.radius.sm,
        border: `1px solid ${zp.surface.border}`,
        background: zp.surface.bg2, color: zp.text.primary, fontSize: 14,
        boxSizing: "border-box", outline: "none", fontFamily: zp.font.sans,
      }}
    />
  );
}
