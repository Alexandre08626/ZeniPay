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

export const SUPABASE_URL = "https://mjkvkibdfteonvlahtag.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qa3ZraWJkZnRlb252bGFodGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDgwMjYsImV4cCI6MjA5MDAyNDAyNn0.yRUCBzFEDWaM8aXBTu4BmkbdX9RdJPGYV_ZJBeG7DD4";
