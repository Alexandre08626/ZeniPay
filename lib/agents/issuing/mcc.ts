// MCC (Merchant Category Code) defaults for card issuing.
//
// Default blocklist: travel categories where Zeniva merchant lives.
// Without this, a CFO could issue a card for an agent that ends up paying
// Zeniva Travel via the Finix live merchant — a circular settlement loop.
// CFOs can override per-card via spending_controls.blocked_mcc.

export const TRAVEL_MCC_DEFAULT_BLOCK: readonly string[] = [
  "4111", // Commuter transport / passenger trains
  "4112", // Passenger railways
  "4121", // Taxicabs & limousines
  "4511", // Airlines
  "4722", // Travel agencies & tour operators
  "4999", // Transportation services — not elsewhere classified
  "7011", // Lodging — hotels, motels, resorts
  "7012", // Timeshares
  "7032", // Sporting & recreational camps
  "7033", // Trailer parks & campgrounds
];

/** Merge CFO-provided blocked_mcc with the Zeniva default block. */
export function mergeBlockedMcc(userSupplied?: string[]): string[] {
  const set = new Set<string>(TRAVEL_MCC_DEFAULT_BLOCK);
  for (const c of userSupplied ?? []) set.add(c);
  return Array.from(set);
}
