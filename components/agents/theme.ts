// Shared visual tokens for the Agents dashboard — mirrors ZenivaComplete.

export const PAGE_BG = "#f0f4f8";
export const CARD_BG = "#ffffff";
export const BORDER = "#e2e8f0";
export const ROW_SEP = "#f1f5f9";
export const TEXT = "#0f172a";
export const MUTED = "#64748b";
export const LIGHT = "#94a3b8";

export const ZP_GREEN = "#2DBE60";
export const ZP_CYAN = "#15B8C9";
export const ZP_PURPLE = "#7B4FBF";
export const ZP_BLUE = "#2A8FE0";
export const ZP_PINK = "#E5247B";
export const ZP_GOLD = "#F5A623";
export const ZP_GRAD = `linear-gradient(135deg, ${ZP_GREEN} 0%, ${ZP_CYAN} 45%, ${ZP_PURPLE} 100%)`;

export const fmtUSD = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};
