// Legacy redirect — /agents/wallets → /agents/treasury.
// Kept to preserve bookmarks and the banner CTA that pointed here in Phase 1.

import { redirect } from "next/navigation";
export default function Wallets() { redirect("/agents/treasury"); }
