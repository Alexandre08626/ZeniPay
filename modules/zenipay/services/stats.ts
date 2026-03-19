// ZeniPay — Stats Service (mock + Supabase ready)

export interface ZeniPayStats {
  totalRevenue: number;
  netRevenue: number;
  pendingPayments: number;
  successfulPayments: number;
  failedPayments: number;
  refunds: number;
  agentCommissions: number;
  platformMargin: number;
  revenueChange: number; // % vs last period
  transactionCount: number;
}

export interface RecentTransaction {
  id: string;
  customerName: string;
  amount: number;
  currency: string;
  status: "completed" | "pending" | "failed" | "refunded";
  paymentMethod: string;
  gateway: string;
  bookingRef?: string;
  createdAt: string;
}

// Generate realistic demo data
export function getMockStats(): ZeniPayStats {
  return {
    totalRevenue: 47230,
    netRevenue: 38940,
    pendingPayments: 8290,
    successfulPayments: 38940,
    failedPayments: 1240,
    refunds: 2340,
    agentCommissions: 4723,
    platformMargin: 9430,
    revenueChange: 12.4,
    transactionCount: 89,
  };
}

export function getMockTransactions(): RecentTransaction[] {
  return [
    { id: "ZNV-8821", customerName: "Sarah Chen", amount: 4250, currency: "USD", status: "completed", paymentMethod: "Visa •••• 4242", gateway: "Helcim", bookingRef: "#9231", createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
    { id: "ZNV-8820", customerName: "Marcus Johnson", amount: 7677, currency: "USD", status: "completed", paymentMethod: "Mastercard •••• 5555", gateway: "Helcim", bookingRef: "#9229", createdAt: new Date(Date.now() - 22 * 60000).toISOString() },
    { id: "ZNV-8819", customerName: "Priya Sharma", amount: 2890, currency: "USD", status: "pending", paymentMethod: "Amex •••• 3714", gateway: "Helcim", bookingRef: "#9228", createdAt: new Date(Date.now() - 45 * 60000).toISOString() },
    { id: "ZNV-8818", customerName: "Luca Rossi", amount: 5320, currency: "USD", status: "completed", paymentMethod: "Visa •••• 1234", gateway: "Helcim", bookingRef: "#9227", createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: "ZNV-8817", customerName: "Emma Wilson", amount: 1850, currency: "USD", status: "refunded", paymentMethod: "Mastercard •••• 9876", gateway: "Helcim", bookingRef: "#9225", createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    { id: "ZNV-8816", customerName: "Diego Torres", amount: 9450, currency: "USD", status: "failed", paymentMethod: "Visa •••• 0011", gateway: "Helcim", bookingRef: "#9224", createdAt: new Date(Date.now() - 8 * 3600000).toISOString() },
    { id: "ZNV-8815", customerName: "Yuki Tanaka", amount: 3670, currency: "USD", status: "completed", paymentMethod: "Visa •••• 7890", gateway: "Helcim", bookingRef: "#9223", createdAt: new Date(Date.now() - 12 * 3600000).toISOString() },
    { id: "ZNV-8814", customerName: "Aisha Okonkwo", amount: 6120, currency: "USD", status: "completed", paymentMethod: "Amex •••• 2011", gateway: "Helcim", bookingRef: "#9222", createdAt: new Date(Date.now() - 18 * 3600000).toISOString() },
  ];
}

export function getMockPayouts() {
  return [
    { agentName: "Marie Laurent", earnings: 12450, commission: 1245, pending: 890, paid: 355, period: "May 2025" },
    { agentName: "James Park", earnings: 8920, commission: 892, pending: 450, paid: 442, period: "May 2025" },
    { agentName: "Sofia Mendez", earnings: 15670, commission: 1567, pending: 1200, paid: 367, period: "May 2025" },
  ];
}
