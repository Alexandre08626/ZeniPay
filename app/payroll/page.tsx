"use client";

// Paie Québec — calculateur de paie.
//
// Premier écran du module : l'employeur saisit une paie et voit le net de
// l'employé ET son coût réel, retenue par retenue. Le calcul passe par
// /api/v1/payroll/calculate, donc l'écran et une future paie enregistrée
// utilisent exactement le même moteur — pas deux vérités.

import { useEffect, useMemo, useState } from "react";

type Frequency = "weekly" | "biweekly" | "semimonthly" | "monthly";

const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: "Hebdomadaire (52)",
  biweekly: "Aux deux semaines (26)",
  semimonthly: "Bimensuelle (24)",
  monthly: "Mensuelle (12)",
};
const PERIODS: Record<Frequency, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

interface Result {
  year: number;
  gross: number;
  employee: {
    qpp: number;
    qppSecond: number;
    ei: number;
    qpip: number;
    federalTax: number;
    quebecTax: number;
    otherDeductions: number;
    totalDeductions: number;
  };
  employer: {
    qpp: number;
    qppSecond: number;
    ei: number;
    qpip: number;
    healthServicesFund: number;
    cnesst: number | null;
    total: number;
  };
  net: number;
  notes: string[];
}

const money = (n: number | null | undefined) =>
  n == null
    ? "—"
    : n.toLocaleString("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 });

export default function PayrollPage() {
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState(2026);
  const [frequency, setFrequency] = useState<Frequency>("biweekly");
  const [gross, setGross] = useState("2500");
  const [rrspAmount, setRrspAmount] = useState("0");
  const [sector, setSector] = useState<"other" | "primary_manufacturing">("other");
  const [totalPayroll, setTotalPayroll] = useState("500000");
  const [cnesstRate, setCnesstRate] = useState("1.84");

  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/v1/payroll/calculate")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.years) && d.years.length) {
          setYears(d.years);
          setYear(d.years[d.years.length - 1]);
        }
      })
      .catch(() => setYears([2026]));
  }, []);

  const annualGross = useMemo(
    () => (Number(gross) || 0) * PERIODS[frequency],
    [gross, frequency]
  );

  async function compute() {
    setLoading(true);
    setError(null);
    try {
      const body = {
        year,
        frequency,
        earnings: [{ code: "REG", label: "Salaire régulier", amount: Number(gross) || 0 }],
        deductions:
          Number(rrspAmount) > 0
            ? [
                {
                  code: "REER",
                  label: "REER collectif",
                  amount: Number(rrspAmount),
                  reducesTaxableIncome: true,
                },
              ]
            : [],
        employer: {
          sector,
          totalAnnualPayroll: Number(totalPayroll) || 0,
          cnesstRate: cnesstRate.trim() === "" ? null : Number(cnesstRate) / 100,
        },
      };
      const res = await fetch("/api/v1/payroll/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || "Le calcul a échoué.");
        setResult(null);
      } else {
        setResult(data.result);
      }
    } catch {
      setError("Impossible de joindre le serveur.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    compute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, frequency]);

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", padding: "80px 20px 60px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
          Paie — Québec
        </h1>
        <p style={{ color: "#64748b", marginBottom: 32, maxWidth: 720, lineHeight: 1.6 }}>
          Brut vers net avec les retenues québécoises et fédérales : RRQ, assurance-emploi au taux
          réduit du Québec, RQAP, impôt des deux ordres de gouvernement, et le coût réel pour
          l&apos;employeur — FSS et CNESST compris.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 380px) 1fr", gap: 24, alignItems: "start" }}>
          {/* ------------------------------ Saisie ------------------------------ */}
          <div style={card}>
            <h2 style={cardTitle}>La paie</h2>

            <Field label="Année d'imposition">
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={input}>
                {(years.length ? years : [2026]).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Fréquence de paie">
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
                style={input}
              >
                {(Object.keys(FREQUENCY_LABEL) as Frequency[]).map((f) => (
                  <option key={f} value={f}>
                    {FREQUENCY_LABEL[f]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Salaire brut de la période">
              <input
                type="number"
                min="0"
                step="0.01"
                value={gross}
                onChange={(e) => setGross(e.target.value)}
                style={input}
              />
              <small style={hint}>
                Soit {money(annualGross)} par année sur {PERIODS[frequency]} périodes.
              </small>
            </Field>

            <Field label="REER collectif (avant impôt)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={rrspAmount}
                onChange={(e) => setRrspAmount(e.target.value)}
                style={input}
              />
            </Field>

            <h2 style={{ ...cardTitle, marginTop: 28 }}>L&apos;employeur</h2>

            <Field label="Secteur (taux du FSS)">
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value as typeof sector)}
                style={input}
              >
                <option value="other">Tous les autres secteurs</option>
                <option value="primary_manufacturing">Primaire ou manufacturier</option>
              </select>
            </Field>

            <Field label="Masse salariale annuelle totale">
              <input
                type="number"
                min="0"
                step="1000"
                value={totalPayroll}
                onChange={(e) => setTotalPayroll(e.target.value)}
                style={input}
              />
              <small style={hint}>Détermine le taux du Fonds des services de santé.</small>
            </Field>

            <Field label="Taux CNESST (%)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={cnesstRate}
                onChange={(e) => setCnesstRate(e.target.value)}
                placeholder="Laisser vide si inconnu"
                style={input}
              />
              <small style={hint}>Le taux figure sur votre avis de cotisation de la CNESST.</small>
            </Field>

            <button onClick={compute} disabled={loading} style={button}>
              {loading ? "Calcul…" : "Calculer la paie"}
            </button>
          </div>

          {/* ------------------------------ Résultat ------------------------------ */}
          <div style={{ display: "grid", gap: 16 }}>
            {error && (
              <div style={{ ...card, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}>
                {error}
              </div>
            )}

            {result && (
              <>
                <div style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
                    <h2 style={{ ...cardTitle, marginBottom: 0 }}>Net à verser</h2>
                    <div style={{ fontSize: 30, fontWeight: 800, color: "#0f172a" }}>
                      {money(result.net)}
                    </div>
                  </div>
                  <Row label="Salaire brut" value={result.gross} strong />
                  <Row label="RRQ" value={-result.employee.qpp} />
                  {result.employee.qppSecond > 0 && (
                    <Row label="RRQ supplémentaire (RRQ2)" value={-result.employee.qppSecond} />
                  )}
                  <Row label="Assurance-emploi" value={-result.employee.ei} />
                  <Row label="RQAP" value={-result.employee.qpip} />
                  <Row label="Impôt fédéral" value={-result.employee.federalTax} />
                  <Row label="Impôt du Québec" value={-result.employee.quebecTax} />
                  {result.employee.otherDeductions > 0 && (
                    <Row label="Retenues volontaires" value={-result.employee.otherDeductions} />
                  )}
                  <div style={separator} />
                  <Row label="Total des retenues" value={-result.employee.totalDeductions} strong />
                  <Row label="Net" value={result.net} strong />
                </div>

                <div style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
                    <h2 style={{ ...cardTitle, marginBottom: 0 }}>Coût pour l&apos;employeur</h2>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>
                      {money(result.gross + result.employer.total)}
                    </div>
                  </div>
                  <Row label="Salaire brut" value={result.gross} />
                  <Row label="RRQ (part de l'employeur)" value={result.employer.qpp} />
                  {result.employer.qppSecond > 0 && (
                    <Row label="RRQ2 (part de l'employeur)" value={result.employer.qppSecond} />
                  )}
                  <Row label="Assurance-emploi (1,4 ×)" value={result.employer.ei} />
                  <Row label="RQAP (part de l'employeur)" value={result.employer.qpip} />
                  <Row label="Fonds des services de santé" value={result.employer.healthServicesFund} />
                  <Row
                    label="CNESST"
                    value={result.employer.cnesst}
                    muted={result.employer.cnesst == null}
                  />
                  <div style={separator} />
                  <Row label="Charges de l'employeur" value={result.employer.total} strong />
                </div>

                {result.notes.length > 0 && (
                  <div style={{ ...card, background: "#fffbeb", borderColor: "#fde68a" }}>
                    <h2 style={{ ...cardTitle, fontSize: 14 }}>À vérifier</h2>
                    <ul style={{ margin: 0, paddingLeft: 18, color: "#78350f", fontSize: 13, lineHeight: 1.7 }}>
                      {result.notes.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: number | null;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "7px 0",
        fontSize: 14,
        color: muted ? "#94a3b8" : strong ? "#0f172a" : "#334155",
        fontWeight: strong ? 700 : 400,
      }}
    >
      <span>{label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {value == null ? "Taux non configuré" : money(value)}
      </span>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  padding: 24,
  border: "1px solid #e2e8f0",
};

const cardTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: "#0f172a",
  marginBottom: 18,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  color: "#0f172a",
  background: "#fff",
};

const hint: React.CSSProperties = {
  display: "block",
  marginTop: 5,
  fontSize: 11.5,
  color: "#94a3b8",
};

const separator: React.CSSProperties = {
  height: 1,
  background: "#e2e8f0",
  margin: "10px 0",
};

const button: React.CSSProperties = {
  width: "100%",
  marginTop: 8,
  padding: "12px 16px",
  borderRadius: 10,
  border: "none",
  background: "#0f172a",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};
