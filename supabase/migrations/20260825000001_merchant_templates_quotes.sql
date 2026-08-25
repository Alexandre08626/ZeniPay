-- Merchant invoice/quote templates + quotes table
-- Chaque merchant peut personnaliser ses factures et devis

create table if not exists public.merchant_invoice_templates (
  merchant_id    text primary key,
  logo_url       text default '',
  brand_color    text default '#15B8C9',
  accent_color   text default '#2DBE60',
  footer_text    text default 'Powered by ZeniPay · zenipay.ca',
  terms_text     text default '',
  quote_validity_days int default 30,
  show_logo      boolean default true,
  show_brand_color boolean default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.merchant_invoice_templates enable row level security;

create table if not exists public.zenipay_quotes (
  id                text primary key,
  merchant_id       text not null,
  quote_number      text,
  customer_name     text not null,
  customer_email    text,
  customer_address  text,
  items             jsonb default '[]'::jsonb,
  subtotal          numeric(12,2) not null default 0,
  tax               numeric(12,2) not null default 0,
  total             numeric(12,2) not null default 0,
  currency          text not null default 'USD',
  status            text not null default 'draft',
  notes             text,
  validity_days     int default 30,
  expires_at        timestamptz,
  sent_at           timestamptz,
  accepted_at       timestamptz,
  converted_to_invoice_id text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_quotes_merchant on public.zenipay_quotes(merchant_id);
create index if not exists idx_quotes_status on public.zenipay_quotes(status);
alter table public.zenipay_quotes enable row level security;
