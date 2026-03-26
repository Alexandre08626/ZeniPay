"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamic imports to keep bundle size sane
const MerchantApp       = dynamic(() => import("./MerchantApp"),    { ssr: false });
const ZenivaCompleteApp = dynamic(() => import("./ZenivaComplete"), { ssr: false });

interface Account {
  id: string; businessName: string; ownerName: string; email: string;
  phone: string; website: string; businessType: string; country: string;
  monthlyVolume: string; status: string; plan: string;
  sandboxKey: string; sandboxSecret: string; liveKey: string;
  createdAt: string; volume: number; txCount: number; balance: number; notes: string;
}

const ZP_GRAD = "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const DARK    = "#0A0F1E";

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
  const [approved, setApproved] = useState(false);

  // Fetch real stats and update account with live numbers
  useEffect(() => {
    if (!account) return;
    fetch("/api/zenipay/stats")
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

    if (!email && !clientId) { router.replace("/login"); return; }

    setMode(storedMode);

    // Zeniva Travel (clientId set, no email needed)
    if (clientId && clientId !== "client" && !email) {
      setAccount({
        id: "cl-001",
        businessName: "Zeniva Travel LLC",
        ownerName: "Alexandre",
        email: "info@zeniva.ca",
        phone: "", website: "https://zenivatravel.com",
        businessType: "Travel Agency", country: "CA",
        monthlyVolume: "200000+",
        status: "live", plan: "Complete",
        sandboxKey: sessionStorage.getItem("zp_client_sandbox_key") || "zpk_sandbox_zeniva_7x2",
        sandboxSecret: "zps_sb_demo",
        liveKey: "zpk_live_zeniva_3k9",
        createdAt: "2026-02-24T00:00:00Z",
        volume: 0, txCount: 0, balance: 0, notes: "",
      });
      setApproved(true);
      setReady(true);
      return;
    }

    // Load from Supabase by email — works on all devices
    const lookupEmail = email || "info@zeniva.ca";
    fetch(`/api/zenipay/merchants?email=${encodeURIComponent(lookupEmail)}`)
      .then(r => r.json())
      .then(({ merchants }) => {
        const found = merchants?.[0];
        if (found) {
          setAccount(found);
          setApproved(found.status === "active" || found.status === "live");
          setReady(true);
          return;
        }
        // Not in DB yet — build fallback with sandbox key from session
        setAccount({
          id: `sess_${Date.now()}`,
          businessName: "My Business", ownerName: "", email: lookupEmail,
          phone: "", website: "", businessType: "", country: "CA", monthlyVolume: "",
          status: "sandbox", plan: "Standard",
          sandboxKey: sessionStorage.getItem("zp_client_sandbox_key") || "",
          sandboxSecret: "",
          liveKey: "",
          createdAt: new Date().toISOString(),
          volume: 0, txCount: 0, balance: 0, notes: "",
        });
        setReady(true);
      })
      .catch(() => {
        setAccount({
          id: `sess_${Date.now()}`,
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

  const isZeniva  = account.plan === "Complete" || account.id === "zeniva-001";
  // mode is driven solely by the user's selection — account.status does not block live mode
  const isSandbox = mode === "sandbox";

  const handleModeChange = (newMode: "sandbox" | "live") => {
    sessionStorage.setItem("zp_client_mode", newMode);
    setMode(newMode);
  };

  // ── Routing logic ─────────────────────────────────────────
  // Zeniva Travel → Complete dashboard
  if (isZeniva) {
    return <ZenivaCompleteApp />;
  }

  // Standard or Business → MerchantApp (sandbox et live même dashboard)
  return (
    <MerchantApp
      account={account}
      mode={isSandbox ? "sandbox" : "live"}
      onSignOut={signOut}
      onApproved={handleApproved}
      onModeChange={handleModeChange}
    />
  );
}
