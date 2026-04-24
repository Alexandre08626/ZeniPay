// DashboardShell — unified product chrome for /app/* and /agents/*.
//
// Parent mounts once; children render inside <main>. Detects merchant vs
// agents mode from the URL. The `mode` prop is optional; if omitted the
// shell infers it from the pathname.

"use client";

import { useRouter, usePathname } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { TopBar, type DashboardMode } from "./TopBar";
import { Sidebar } from "./Sidebar";
import zp from "@/lib/design-system/zenipay-brand";

interface Session {
  email: string;
  label: string;
  orgId?: string;
}

function readMerchantSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const email = sessionStorage.getItem("zp_client_email") || "";
    const clientId = sessionStorage.getItem("zp_client") || "";
    if (!email && !clientId) return null;
    const label =
      sessionStorage.getItem("zp_client_bname") ||
      sessionStorage.getItem("zp_client_first_name") ||
      (email.split("@")[0] || "").split(".")[0] ||
      "Account";
    return { email, label };
  } catch {
    return null;
  }
}

function readAgentsSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const email = sessionStorage.getItem("zp_agents_email") || "";
    const orgId = sessionStorage.getItem("zp_agents_org") || "";
    if (!email || !orgId) return null;
    const label = email.split("@")[0] || "Agents";
    return { email, label, orgId };
  } catch {
    return null;
  }
}

function clearMerchantSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem("zp_client_email");
    sessionStorage.removeItem("zp_client");
    sessionStorage.removeItem("zp_client_bname");
    sessionStorage.removeItem("zp_client_first_name");
    sessionStorage.removeItem("zp_client_mode");
    sessionStorage.removeItem("zp_client_sandbox_key");
  } catch { /* ignore */ }
}

function clearAgentsSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem("zp_agents_email");
    sessionStorage.removeItem("zp_agents_org");
    sessionStorage.removeItem("zp_agents_user_id");
  } catch { /* ignore */ }
}

export interface DashboardShellProps {
  /** If omitted, inferred from pathname. */
  mode?: DashboardMode;
  children: React.ReactNode;
}

export function DashboardShell({ mode: modeProp, children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const inferredMode: DashboardMode = useMemo(
    () =>
      pathname.startsWith("/agents")    ? "agents"   :
      pathname.startsWith("/personal")  ? "personal" :
                                          "merchant",
    [pathname],
  );
  const mode = modeProp ?? inferredMode;
  // Lazy-init: read any existing session synchronously before first render.
  // Prevents a flash of "Loading…" for users who already have a valid
  // session, and — critically — ensures the session is in place before
  // child pages' effects call apiFetch (React runs child effects before
  // parent effects, so a useEffect-only bootstrap loses the race).
  // Personal mode reuses the merchant session — there's no separate
  // login. The same merchant_id keys both /app/* and /personal/* data.
  const [session, setSession] = useState<Session | null>(() => {
    if (typeof window === "undefined") return null;
    const path = window.location.pathname;
    const initialMode: DashboardMode =
      modeProp ?? (
        path.startsWith("/agents")   ? "agents"   :
        path.startsWith("/personal") ? "personal" :
                                       "merchant"
      );
    return initialMode === "agents" ? readAgentsSession() : readMerchantSession();
  });
  const [bootstrapped, setBootstrapped] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname;
    const initialMode: DashboardMode =
      modeProp ?? (
        path.startsWith("/agents")   ? "agents"   :
        path.startsWith("/personal") ? "personal" :
                                       "merchant"
      );
    const s = initialMode === "agents" ? readAgentsSession() : readMerchantSession();
    return !!s;
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Bootstrap the right session based on mode. If a user lands on an
  // /agents/* page with only a merchant session, we try to grant an
  // agents session from the merchant↔org mapping (PR 10). That way
  // deep-linked URLs like /agents/agents/<id> don't bounce merchants
  // back to /agents/login when the org is already linked.
  useEffect(() => {
    const primary = mode === "agents" ? readAgentsSession() : readMerchantSession();
    if (primary) {
      setSession(primary);
      setBootstrapped(true);
      return;
    }

    // Cross-auth path: merchant session → agents session.
    const merchant = mode === "agents" ? readMerchantSession() : null;
    if (merchant) {
      let cancelled = false;
      (async () => {
        try {
          const merchantClientId =
            typeof window !== "undefined" ? sessionStorage.getItem("zp_client") || "" : "";
          if (!merchantClientId) throw new Error("no merchant session");
          const r = await fetch(`/api/v1/agents/list-for-merchant?merchant_id=${encodeURIComponent(merchantClientId)}`);
          const data = (await r.json().catch(() => ({}))) as { organization_id?: string | null };
          if (cancelled) return;
          if (!data.organization_id) {
            router.replace("/agents/login");
            return;
          }
          // Seed the agents session so apiFetch picks up the x-zp-agents-org header.
          try {
            sessionStorage.setItem("zp_agents_org", data.organization_id);
            if (merchant.email) sessionStorage.setItem("zp_agents_email", merchant.email);
          } catch { /* ignore */ }
          const label = merchant.label || "Agents";
          setSession({ email: merchant.email || "agents@zenipay.ca", label, orgId: data.organization_id });
          setBootstrapped(true);
        } catch {
          if (!cancelled) router.replace("/agents/login");
        }
      })();
      return () => { cancelled = true; };
    }

    router.replace(mode === "agents" ? "/agents/login" : "/login");
  }, [mode, router]);

  // Close drawer on route change.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const signOut = useCallback(() => {
    if (mode === "agents") {
      clearAgentsSession();
      router.replace("/agents/login");
    } else {
      // Both merchant + personal share the merchant session.
      clearMerchantSession();
      router.replace("/login");
    }
  }, [mode, router]);

  return (
    <div className="zp-dashboard" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <TopBar
        mode={mode}
        userLabel={session?.label}
        userEmail={session?.email}
        onSignOut={signOut}
      />

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Sidebar mode={mode} openDrawer={drawerOpen} onCloseDrawer={() => setDrawerOpen(false)} />

        <main style={{ flex: 1, minWidth: 0, position: "relative" }}>
          {/* Mobile hamburger — shown only under 900px (see css below). */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="zp-shell-menu"
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              width: 36,
              height: 36,
              borderRadius: zp.radius.sm,
              background: zp.surface.bg2,
              border: `1px solid ${zp.surface.border}`,
              color: zp.text.primary,
              cursor: "pointer",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              zIndex: zp.zIndex.sticky,
            }}
          >
            <Menu size={18} />
          </button>

          <div style={{ padding: "28px 32px", maxWidth: 1360, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
            {bootstrapped ? children : (
              <div style={{ color: zp.text.muted, fontSize: 13, padding: "40px 0" }}>
                Loading…
              </div>
            )}
          </div>

          <style>{mainCss}</style>
        </main>
      </div>
    </div>
  );
}

const mainCss = `
@media (max-width: 900px) {
  .zp-shell-menu { display: inline-flex !important; }
}
`;

export default DashboardShell;
