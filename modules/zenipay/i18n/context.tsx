"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { en } from "./en";
import { fr } from "./fr";

type Lang = "en" | "fr";
type Dict = Record<string, unknown>;

const dicts: Record<Lang, Dict> = { en, fr };

function get(obj: Dict, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Dict)) {
      cur = (cur as Dict)[p];
    } else {
      return path; // fallback: return key
    }
  }
  return typeof cur === "string" ? cur : path;
}

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const Ctx = createContext<LangCtx>({ lang: "en", setLang: () => {}, t: (k) => k });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("zp_lang") as Lang | null;
    if (saved === "fr" || saved === "en") setLangState(saved);
    setMounted(true);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("zp_lang", l);
  }, []);

  const t = useCallback((key: string): string => {
    return get(dicts[lang], key);
  }, [lang]);

  // Avoid hydration mismatch: render children only after mount
  if (!mounted) return <>{children}</>;

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useT() {
  return useContext(Ctx);
}

/** Compact language toggle button */
export function LangToggle({ style }: { style?: React.CSSProperties }) {
  const { lang, setLang } = useT();
  return (
    <button
      onClick={() => setLang(lang === "en" ? "fr" : "en")}
      style={{
        background: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: 8,
        padding: "5px 10px",
        color: "#fff",
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        letterSpacing: "0.05em",
        ...style,
      }}
    >
      {lang === "en" ? "FR" : "EN"}
    </button>
  );
}

/** Light-themed toggle for public pages */
export function LangToggleLight({ style }: { style?: React.CSSProperties }) {
  const { lang, setLang } = useT();
  return (
    <button
      onClick={() => setLang(lang === "en" ? "fr" : "en")}
      style={{
        background: "rgba(0,0,0,0.05)",
        border: "1px solid rgba(0,0,0,0.1)",
        borderRadius: 8,
        padding: "5px 10px",
        color: "#374151",
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        letterSpacing: "0.05em",
        ...style,
      }}
    >
      {lang === "en" ? "FR" : "EN"}
    </button>
  );
}
