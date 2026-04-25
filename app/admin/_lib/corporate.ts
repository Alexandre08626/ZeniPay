// ZeniPay corporate identity — the "house" merchant row that owns
// ZeniPay's OWN wallet. Distinct from every merchant client row
// (e.g., zeniva-001) which only ever shows up in /app/* surfaces.
//
// Admin wallet pages (/admin/wallet/*) read from this ID.
// Admin back-office pages (/admin/merchants, /admin/transactions…)
// EXCLUDE this ID from every "clients" list.

export const ZENIPAY_CORPORATE_MERCHANT_ID = "acc_1774740862294";
export const ZENIPAY_CORPORATE_NAME = "ZeniPay (International Luxury Management Inc.)";
