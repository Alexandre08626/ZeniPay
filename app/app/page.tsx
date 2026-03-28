"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamic import — all merchants use ZenivaComplete
const ZenivaCompleteApp = dynamic(() => import("./ZenivaComplete"), { ssr: false });

interface Account {
  id: string; businessName: string; ownerName: string; email: string;
  phone: string; website: string; businessType: string; country: string;
  monthlyVolume: string; status: string; plan: string;
  sandboxKey: string; sandboxSecret: string; liveKey: string;
  createdAt: string; volume: number; txCount: number; balance: number; notes: string;
}

const DARK = "#0A0F1E";

function Loader() {
  return (
    <div style={{ minHeight: "100vh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #15B8C9", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function AppRouter() {
  const router = useRouter();
  const [ready,    setReady]    = useState(false);
  const [account,  setAccount]  = useState<Account | null>(null);
  const [mode,     setMode]     = useState<"sandbox" | "live">("sandbox");
  const [, setApproved] = useState(false);

  // Fetch real stats and update account with live numbers (filtered by merchant)
  useEffect(() => {
    if (!account) return;
    const mid = account.id;
    const url = mid ? `/api/zenipay/stats?merchant_id=${encodeURIComponent(mid)}` : "/api/zenipay/stats";
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data?.stats) {
          setAccount(prev => prev ? {
            ...prev,
            volume: data.stats.total_revenue || 0,
            txCount: data.stats.total_payments || 0,
            balance: data.stats.total_revenue || 0,
          } : prev);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!account]);

  useEffect(() => {
    const email      = sessionStorage.getItem("zp_client_email");
    const clientId   = sessionStorage.getItem("zp_client");
    const storedMode = (sessionStorage.getItem("zp_client_mode") as "sandbox" | "live") || "sandbox";

    // Detect mode from URL: /sandbox/... = sandbox mode
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    const isSandboxUrl = path.startsWith("/sandbox");
    const urlMode = isSandboxUrl ? "sandbox" : storedMode;

    // Detect merchantId from URL: /app/{merchantId}/... or /sandbox/{merchantId}/...
    const urlParts = path.split("/").filter(Boolean);
    const urlMerchantId = urlParts.length >= 2 ? urlParts[1] : null;
    // If we have a merchantId from URL, use it
    if (urlMerchantId && !email && !clientId) {
      sessionStorage.setItem("zp_client", urlMerchantId);
    }

    if (!email && !clientId && !urlMerchantId) { router.replace("/login"); return; }

    setMode(urlMode);
    if (urlMode !== storedMode) sessionStorage.setItem("zp_client_mode", urlMode);

    // Load merchant from Supabase via merchant-info API (reads merchant_data JSONB — PostgREST safe)
    const lookupEmail = email || "";
    const lookupId = clientId || "";
    if (!lookupEmail && !lookupId) { router.replace("/login"); return; }

    fetch(`/api/zenipay/merchant-info?${lookupEmail ? `email=${encodeURIComponent(lookupEmail)}` : `id=${encodeURIComponent(lookupId)}`}`)
      .then(r => r.json())
      .then((data) => {
        if (data.merchant) {
          const m = data.merchant;
          setAccount({
            id: m.id, businessName: m.businessName || "My Business", ownerName: m.ownerName || "",
            email: m.email || lookupEmail, phone: m.phone || "", website: m.website || "",
            businessType: m.businessType || "", country: m.country || "CA", monthlyVolume: m.monthlyVolume || "",
            status: m.status || "sandbox", plan: m.plan || "Standard",
            sandboxKey: m.sandboxKey || sessionStorage.getItem("zp_client_sandbox_key") || "",
            sandboxSecret: m.sandboxSecret || "", liveKey: m.liveKey || "",
            createdAt: m.createdAt || new Date().toISOString(),
            volume: 0, txCount: 0, balance: 0, notes: "",
          });
          setApproved(m.status === "active" || m.status === "live");
          setReady(true);
          return;
        }
        // Not in DB yet — build fallback
        setAccount({
          id: lookupId || `sess_${Date.now()}`,
          businessName: "My Business", ownerName: "", email: lookupEmail,
          phone: "", website: "", businessType: "", country: "CA", monthlyVolume: "",
          status: "sandbox", plan: "Standard",
          sandboxKey: sessionStorage.getItem("zp_client_sandbox_key") || "",
          sandboxSecret: "", liveKey: "",
          createdAt: new Date().toISOString(),
          volume: 0, txCount: 0, balance: 0, notes: "",
        });
        setReady(true);
      })
      .catch(() => {
        setAccount({
          id: lookupId || `sess_${Date.now()}`,
          businessName: "My Business", ownerName: "", email: lookupEmail,
          phone: "", website: "", businessType: "", country: "CA", monthlyVolume: "",
          status: "sandbox", plan: "Standard",
          sandboxKey: sessionStorage.getItem("zp_client_sandbox_key") || "",
          sandboxSecret: "", liveKey: "",
          createdAt: new Date().toISOString(),
          volume: 0, txCount: 0, balance: 0, notes: "",
        });
        setReady(true);
      });
  }, [router]);

  const signOut = () => { sessionStorage.clear(); router.replace("/login"); };

  const handleApproved = () => {
    if (account) {
      const key = `zp_approval_${account.email}`;
      try {
        const d = JSON.parse(localStorage.getItem(key) || "{}");
        localStorage.setItem(key, JSON.stringify({ ...d, approved: true }));
      } catch {}
    }
    setApproved(true);
  };

  if (!ready || !account) return <Loader />;

  // All merchants use the same ZenivaComplete dashboard
  // Store business name in sessionStorage for ZenivaComplete to read
  if (typeof window !== "undefined") {
    sessionStorage.setItem("zp_client_bname", account.businessName || "My Business");
  }

  return (
    <ZenivaCompleteApp
      merchantId={account.id}
      businessName={account.businessName}
      ownerName={account.ownerName}
      email={account.email}
      mode={mode}
      onSignOut={signOut}
    />
  );
}
