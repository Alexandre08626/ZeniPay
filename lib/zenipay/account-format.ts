// Helpers for formatting ZeniPay-internal account numbers.
//
// Format rule (Alex): group the *digits* of an account number in
// groups of 3, leaving any non-digit prefix intact.
//   "ZP839809070"        → "ZP839 809 070"
//   "ZPORG123456789"     → "ZPORG123 456 789"
//   "ZPTREASURY70315953" → "ZPTREASURY70 315 953"
//   "ZPCA0001"           → "ZPCA0001"          (routing codes left as-is)

export function formatZPAccount(num: string | null | undefined): string {
  if (!num) return "";
  const trimmed = String(num).trim();
  // Split at the boundary between the alphabetic prefix and the digit run.
  const m = trimmed.match(/^([A-Za-z]+)(\d+)$/);
  if (!m) return trimmed;
  const [, prefix, digits] = m;
  // Group the digits from the RIGHT in groups of 3.
  const reversed = digits.split("").reverse().join("");
  const grouped = reversed.match(/.{1,3}/g)?.join(" ") ?? digits;
  const groupedForward = grouped.split("").reverse().join("");
  return `${prefix}${groupedForward}`;
}

/** Strip non-digits except the leading "ZP*" prefix — used by the copy
 *  button so users get a clean, paste-ready value. */
export function rawZPAccount(num: string | null | undefined): string {
  if (!num) return "";
  return String(num).replace(/\s+/g, "");
}
