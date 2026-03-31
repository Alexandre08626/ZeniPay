"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0F1E", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 480, padding: 40 }}>
        <div style={{ fontSize: 72, fontWeight: 900, color: "#EF4444", marginBottom: 16 }}>500</div>
        <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: "0 0 12px" }}>Something went wrong</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, lineHeight: 1.6, margin: "0 0 32px" }}>An unexpected error occurred. Please try again.</p>
        <button onClick={reset} style={{ background: "linear-gradient(135deg, #2DBE60, #15B8C9, #7B4FBF)", color: "#fff", border: "none", padding: "12px 32px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Try again</button>
      </div>
    </div>
  );
}
