# ZeniPay Merchant Platform - New Project Setup

This directory contains the complete schema and account creation scripts for a **dedicated ZeniPay Merchant Supabase project** (separate from Zeniva Travel).

## 📁 Project Structure

```
supabase/migrations/merchant-project/
├── 001_zenipay_merchants.sql       # Core merchants table with RLS
├── 002_zenipay_billing.sql         # Platform billing to merchants
├── 003_zenipay_access_requests.sql # Waitlist/contact forms
├── 004_merchants_rls.sql           # RLS policies + updated_at trigger
├── 005_zenipay_payments.sql        # Payment transactions
├── 006_zenipay_invoices.sql        # Merchant-issued invoices
├── 007_zenipay_payouts.sql         # Merchant payouts to vendors
└── 008_zenipay_bank_accounts.sql   # Bank accounts for ACH/wire

scripts/
├── create-zeniva-accounts.ts       # Creates admin + merchant accounts
```

## 🚀 Quick Start

### 1. Create New Supabase Project
1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Name: `ZeniPay Merchants` (or similar)
4. Region: `us-east-1` (or closest to your users)
5. Database password: Generate strong password
6. Wait for project to be ready (~2 min)

### 2. Get Credentials
From your new project dashboard: **Settings → API**
- Copy **Project URL** → `SUPABASE_URL`
- Copy **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Configure Environment
```bash
cp .env.local.merchant-template .env.local
# Edit .env.local with your new project credentials
```

### 4. Run Migrations
```bash
# Link to your new project
npx supabase link --project-ref <your-new-project-ref>

# Push all migrations
npx supabase db push
```

### 5. Create Zeniva Accounts
```bash
npx tsx scripts/create-zeniva-accounts.ts
```

## 🔐 Accounts Created

| Account | Email | Role | Purpose |
|---------|-------|------|---------|
| **Admin** | `admin@zeniva.ca` | Platform Admin | Full ZeniPay platform access |
| **Merchant** | `payments@zeniva.ca` | Merchant | Zeniva Travel payment processing |

## 📊 Default Credentials (Change in Production!)

```
ADMIN (Platform):
  Email: admin@zeniva.ca
  Password: ZenivaAdmin2026!
  Status: active (Enterprise)
  Sandbox Key: zpk_sb_admin_...
  Live Key: zpk_lk_admin_...

MERCHANT (Zeniva Travel):
  Email: payments@zeniva.ca
  Password: ZenivaPayments2026!
  Status: sandbox (Professional)
  Sandbox Key: zpk_sb_zeniva_...
  Live Key: zpk_lk_zeniva_...
```

## 🌐 Access URLs (zenipay.ca production)

- **Login**: `https://zenipay.ca/login`
- **Admin Login**: `https://zenipay.ca/admin/login`
- **Admin Dashboard**: `https://zenipay.ca/admin`
- **Merchant App**: `https://zenipay.ca/app/overview`

## 🔒 Security Notes

1. **Never commit `.env.local`** - It's in `.gitignore`
2. **Rotate passwords after first login** via Settings → Security
3. **Enable MFA** for admin accounts in Supabase Auth
4. **Review RLS policies** in `004_merchants_rls.sql` for your compliance needs

## 📦 Tables Overview

| Table | Purpose | RLS |
|-------|---------|-----|
| `zenipay_merchants` | Core merchant records | ✅ Merchant own row, Admin all |
| `zenipay_billing` | Platform invoices to merchants | ✅ Merchant own, Admin all |
| `zenipay_access_requests` | Waitlist/contact leads | ✅ Service role insert, Admin read |
| `zenipay_payments` | Customer → Merchant payments | ✅ Merchant own, Admin all |
| `zenipay_invoices` | Merchant → Customer invoices | ✅ Merchant own, Admin all |
| `zenipay_payouts` | Merchant → Vendor payouts | ✅ Merchant own, Admin all |
| `zenipay_bank_accounts` | Merchant bank accounts | ✅ Merchant own, Admin all |

## 🛠 Development

```bash
# Start local dev server (uses .env.local)
npm run dev

# Run migrations locally (requires Docker)
npx supabase start
npx supabase db push

# Generate TypeScript types
npx supabase gen types typescript --project-id <ref> > types/supabase.ts
```

## 📝 Next Steps

1. **Deploy to Vercel** with the new Supabase project
2. **Configure custom domain** (zenipay.ca or merchants.zenipay.ca)
3. **Set up Finix/Tilled/Stripe** webhooks in new project
4. **Configure email templates** in Supabase Auth
5. **Run compliance review** for PCI/SOC2