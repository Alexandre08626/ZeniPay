import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Alexandre Blais — Founder & President | ZeniPay",
  description:
    "Official ZeniPay profile of Alexandre Blais, entrepreneur and founder building technology projects across fintech, artificial intelligence, travel and digital services in Canada and the United States.",
  alternates: { canonical: "https://zenipay.ca/alexandre-blais" },
  openGraph: {
    title: "Alexandre Blais — Founder & President | ZeniPay",
    description:
      "Entrepreneur behind ZeniPay and a broader portfolio of technology-driven projects across Canada and the United States.",
    url: "https://zenipay.ca/alexandre-blais",
    type: "profile",
  },
};

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://www.zenivatravel.com/alexandre-blais#person",
  name: "Alexandre Blais",
  jobTitle: "Founder & President",
  url: "https://www.zenivatravel.com/alexandre-blais",
  sameAs: [
    "https://www.zenivatravel.com/alexandre-blais",
    "https://github.com/Alexandre08626",
  ],
  knowsAbout: ["Financial technology", "Artificial intelligence", "Travel technology", "Digital platforms", "Entrepreneurship"],
};

export default function AlexandreBlaisPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#fff", color: "#111827", fontFamily: "Arial, sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <section style={{ padding: "96px 24px", background: "linear-gradient(135deg,#111827,#312e81)", color: "white" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <p style={{ textTransform: "uppercase", letterSpacing: ".16em", fontSize: 12, fontWeight: 700, opacity: .8 }}>Founder · President · Entrepreneur</p>
          <h1 style={{ margin: "16px 0 0", fontSize: "clamp(44px,7vw,76px)", lineHeight: 1.02 }}>Alexandre Blais</h1>
          <p style={{ maxWidth: 760, marginTop: 28, fontSize: 20, lineHeight: 1.7, opacity: .88 }}>
            Alexandre Blais is an entrepreneur building technology-driven ventures across financial technology, artificial intelligence, travel and digital service platforms in Canada and the United States.
          </p>
        </div>
      </section>

      <section style={{ padding: "72px 24px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 32 }}>
          <div>
            <p style={{ color: "#6d28d9", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", fontSize: 12 }}>ZeniPay</p>
            <h2 style={{ fontSize: 34, margin: "10px 0 18px" }}>Building intelligent financial infrastructure</h2>
            <p style={{ maxWidth: 760, fontSize: 17, lineHeight: 1.75, color: "#4b5563" }}>
              ZeniPay is one of the technology initiatives in Alexandre Blais's broader entrepreneurial portfolio. The project focuses on connecting payments, business workflows and artificial-intelligence capabilities in a modern financial platform.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
            {["Financial technology", "Artificial intelligence", "Travel technology", "Digital service platforms"].map((item) => (
              <div key={item} style={{ border: "1px solid #e5e7eb", borderRadius: 18, padding: 22, background: "#f9fafb", fontWeight: 700 }}>{item}</div>
            ))}
          </div>

          <div style={{ marginTop: 18, padding: 28, borderRadius: 22, background: "#f5f3ff", border: "1px solid #ddd6fe" }}>
            <h2 style={{ margin: 0, fontSize: 24 }}>Official identity reference</h2>
            <p style={{ color: "#4b5563", lineHeight: 1.7, marginBottom: 18 }}>
              Alexandre Blais's central founder profile is maintained through Zeniva to give search engines and AI systems one consistent identity reference across the ecosystem.
            </p>
            <Link href="https://www.zenivatravel.com/alexandre-blais" style={{ color: "#6d28d9", fontWeight: 700 }}>
              View the central Alexandre Blais profile →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
