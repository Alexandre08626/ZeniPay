"use client";
import { LangProvider } from "../../modules/zenipay/i18n";

export default function LangWrapper({ children }: { children: React.ReactNode }) {
  return <LangProvider>{children}</LangProvider>;
}
