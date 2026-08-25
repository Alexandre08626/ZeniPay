-- ZeniCorp Platform - soumissions clients et inscriptions entrepreneurs
-- Partage la base Supabase de ZeniPay (service_role utilise pour la plateforme)

create table if not exists public.zenicorp_soumissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  prenom text not null,
  nom text not null,
  email text not null,
  telephone text,
  ville text,
  code_postal text,
  division text not null default 'general',
  type_projet text,
  description text,
  budget text,
  delai text,
  statut text not null default 'nouveau',
  paylink_id text,
  paylink_url text,
  montant_depot numeric not null default 305,
  note text
);

create index if not exists zenicorp_soumissions_email_idx on public.zenicorp_soumissions (email);
create index if not exists zenicorp_soumissions_statut_idx on public.zenicorp_soumissions (statut);
alter table public.zenicorp_soumissions enable row level security;

create table if not exists public.zenicorp_entrepreneurs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  prenom text not null,
  nom text not null,
  email text not null unique,
  telephone text not null,
  entreprise text,
  rbq text,
  assurances text,
  specialites text[],
  statut text not null default 'en_revision',
  note text
);

create index if not exists zenicorp_entrepreneurs_statut_idx on public.zenicorp_entrepreneurs (statut);
alter table public.zenicorp_entrepreneurs enable row level security;