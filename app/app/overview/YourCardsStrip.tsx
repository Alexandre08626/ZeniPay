// PR 16 — horizontal strip of the merchant's active virtual cards.
// Mounted on /app/overview when at least one card exists. Silent on
// Coming-soon / empty states to keep the overview clean.

"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import zp from "@/lib/design-system/zenipay-brand";

interface MerchantCardSummary {
  id: string;
  last4: string | null;
  cardholder_name: string;
  exp_month: number | null;
  exp_year: number | null;
  status: "active" | "frozen" | "cancelled";
}

function mid(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") ?? "";
}

export function YourCardsStrip() {
  const [cards, setCards] = useState<MerchantCardSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const m = mid();
    if (!m) return;
    try {
      const r = await fetch(`/api/v1/merchant/cards?merchant_id=${encodeURIComponent(m)}`);
      const data = await r.json().catch(() => ({}));
      setCards(((data.cards ?? []) as MerchantCardSummary[]).filter((c) => c.status !== "cancelled"));
    } finally { setLoaded(true); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (!loaded || cards.length === 0) return null;

  return (
    <section style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.2px" }}>Your cards</h2>
        <Link href="/app/cards" style={{ fontSize: 12, fontWeight: zp.weight.semibold, color: zp.brand.cyan, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
          Manage cards <ArrowRight size={12} />
        </Link>
      </div>
      <div
        style={{
          display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6,
          scrollbarWidth: "thin" as const,
        }}
      >
        {cards.map((c) => <MiniCard key={c.id} card={c} />)}
      </div>
    </section>
  );
}

function MiniCard({ card }: { card: MerchantCardSummary }) {
  const gradient = card.status === "frozen"
    ? "linear-gradient(135deg, #334155 0%, #475569 100%)"
    : `linear-gradient(135deg, ${zp.brand.green} 0%, ${zp.brand.cyan} 50%, ${zp.brand.violet} 100%)`;
  const expiry = card.exp_month && card.exp_year
    ? `${String(card.exp_month).padStart(2, "0")}/${String(card.exp_year).slice(-2)}`
    : "—";
  return (
    <Link href="/app/cards" style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{
        flex: "0 0 260px",
        background: gradient,
        color: "#fff",
        borderRadius: zp.radius.lg,
        padding: 18,
        minHeight: 140,
        boxShadow: zp.elevation.md,
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
      }}>
        <span aria-hidden style={{ position: "absolute", right: -60, top: -60, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
        <div style={{ fontSize: 9, fontWeight: zp.weight.semibold, letterSpacing: "0.14em", textTransform: "uppercase" as const, opacity: 0.85, position: "relative", zIndex: 1 }}>
          Virtual · Online
        </div>
        <div style={{ marginTop: 28, fontFamily: zp.font.mono, fontSize: 16, letterSpacing: "0.14em", fontWeight: zp.weight.medium, position: "relative", zIndex: 1 }}>
          •••• {card.last4 || "••••"}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14, position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: zp.weight.semibold, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {card.cardholder_name}
          </div>
          <div style={{ fontSize: 10, fontFamily: zp.font.mono, fontWeight: zp.weight.semibold }}>
            {expiry}
          </div>
        </div>
      </div>
    </Link>
  );
}
