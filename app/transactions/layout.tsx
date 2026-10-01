import type { Metadata } from "next";

// Page vide (placeholder) : gardée hors de l'index Google.
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
