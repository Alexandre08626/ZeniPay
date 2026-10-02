// Footer link to Zenitech's "AI agents by industry" page.
// French pages (explicit lang="fr", /fr/*, or the legacy i18n toggle set to
// FR) point to the French page; everything else points to the English one.

"use client";

import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/modules/zenipay/i18n";

const FR = { href: "https://zenitech.dev/agents-ia", label: "Agents IA par métier — Zenitech" };
const EN = { href: "https://zenitech.dev/en/ai-agents", label: "AI agents by industry — Zenitech" };

export function ZenitechAgentsLink({ style, lang: forced }: { style?: CSSProperties; lang?: "en" | "fr" }) {
  const pathname = usePathname() || "";
  const { lang } = useT();
  const isFr = forced
    ? forced === "fr"
    : pathname === "/fr" || pathname.startsWith("/fr/") || lang === "fr";
  const l = isFr ? FR : EN;
  return (
    <a href={l.href} hrefLang={isFr ? "fr" : "en"} style={style}>
      {l.label}
    </a>
  );
}
