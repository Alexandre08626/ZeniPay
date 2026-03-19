"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamic imports to keep bundle size sane
const MerchantApp      = dynamic(() => import("./MerchantApp"),      { ssr: false });
const ZenivaCompleteApp = dynamic(() => import("./ZenivaComplete"),   { ssr: false });
const SandboxApproval   = dynamic(() => import("./SandboxApproval"), { ssr: false });

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
  const [ready,   setReady]   = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [mode,    setMode]    = useState<"sandbox" | "live">("sandbox");
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    const email      = sessionStorage.getItem("zp_client_email");
    const clientId   = sessionStorage.getItem("zp_client");
    const storedMode = (sessionStorage.getItem("zp_client_mode") as "sandbox" | "live") || "sandbox";

    if (!email && !clientId) { router.replace("/login"); return; }

    setMode(storedMode);

    // Try to find account in localStorage (merchant signups)
    if (email) {
      try {
        const all: Account[] = JSON.parse(localStorage.getItem("zp_accounts") || "[]");
        const found = all.find(a => a.email === email);
        if (found) {
          setAccount(found);
          // Check if approval was simulated
          const approvalKey = `zp_approval_${email}`;
          try {
            const approval = JSON.parse(localStorage.getItem(approvalKey) || "{}");
            if (approval.approved) setApproved(true);
          } catch {}
          setReady(true);
          return;
        }
      } catch {}
    }

    // Zeniva Travel demo client (clientId = "demo" or "zeniva") — no account in localStorage
    if (clientId && clientId !== "client") {
      // Build a placeholder Zeniva account
      setAccount({
        id: "zeniva-001",
        businessName: "Zeniva Travel LLC",
        ownerName: "Alexandre",
        email: email || "client@zenipay.ca",
        phone: "", website: "https://zeniva.ca",
        businessType: "Travel Agency", country: "CA",
        monthlyVolume: "200000+",
        status: "live", plan: "Complete",
        sandboxKey: sessionStorage.getItem("zp_client_sandbox_key") || "zpk_sb_demo",
        sandboxSecret: "zps_sb_demo",
        liveKey: "zpk_live_demo",
        createdAt: "2025-01-01T00:00:00Z",
        volume: 284750, txCount: 1842, balance: 12480, notes: "",
      });
      setApproved(true);
      setReady(true);
      return;
    }

    // Fallback placeholder
    setAccount({
      id: "", businessName: "My Business", ownerName: "", email: email || "",
      phone: "", website: "", businessType: "", country: "CA", monthlyVolume: "",
      status: "sandbox", plan: "Standard",
      sandboxKey: sessionStorage.getItem("zp_client_sandbox_key") || "",
      sandboxSecret: sessionStorage.getItem("zp_client_sandbox_secret") || "",
      liveKey: "",
      createdAt: new Date().toISOString(),
      volume: 0, txCount: 0, balance: 0, notes: "",
    });
    setReady(true);
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
  const isSandbox = mode === "sandbox" || account.status === "sandbox";

  // ── Routing logic ─────────────────────────────────────────
  // Zeniva Travel → Complete dashboard
  if (isZeniva) {
    return <ZenivaCompleteApp />;
  }

  // Standard/Business — sandbox + not approved → show approval flow
  if (isSandbox && !approved && account.status !== "live") {
    return (
      <SandboxApproval
        email={account.email}
        businessName={account.businessName}
        sandboxKey={account.sandboxKey}
        sandboxSecret={account.sandboxSecret}
        onApproved={handleApproved}
      />
    );
  }

  // Standard or Business → MerchantApp
  return (
    <MerchantApp
      account={account}
      mode={isSandbox ? "sandbox" : "live"}
      onSignOut={signOut}
    />
  );
}
