export const FINIX_CONFIG = {
  baseUrl:
    process.env.FINIX_ENV === "production"
      ? "https://finix.live-payments-api.com"
      : "https://finix.sandbox-payments-api.com",
  apiUsername: process.env.FINIX_API_USERNAME || "",
  apiPassword: process.env.FINIX_API_PASSWORD || "",
  applicationId: process.env.FINIX_APPLICATION_ID || "",
  merchantId: process.env.FINIX_MERCHANT_ID || "MUcTenaz57m9JrwwRZwpSfDc",
  identityId: process.env.FINIX_MERCHANT_IDENTITY_ID || "IDoCxHhKh8e1M1MjeW3RDoKD",
  environment: (process.env.FINIX_ENV || "sandbox") as "sandbox" | "production",
  apiVersion: "2022-02-01",
};

// Supabase credentials — always read from env, never hardcoded
export const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";
