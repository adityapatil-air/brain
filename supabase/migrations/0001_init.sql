-- =============================================================================
-- ASHA Care — initial schema
-- Run this in the Supabase SQL editor (or `supabase db push`) before seeding.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('asha', 'phc_doctor', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type triage_level as enum ('GREEN', 'YELLOW', 'RED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type visit_status as enum ('draft', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type referral_status as enum ('pending', 'acknowledged', 'reviewed', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type referral_urgency as enum ('routine', 'soon', 'urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type symptom_source as enum ('manual', 'voice', 'ai');
exception when duplicate_object then null; end $$;

do $$ begin
  create type facility_type as enum ('hospital', 'phc', 'government_hospital', 'emergency_facility', 'clinic');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid not null unique references auth.users(id) on delete cascade,
  full_name     text not null,
  role          user_role not null default 'asha',
  asha_code     text unique,
  phone         text,
  village       text,
  district      text,
  state         text,
  created_at    timestamptz not null default now()
);

create index if not exists profiles_auth_user_id_idx on public.profiles(auth_user_id);
create index if not exists profiles_role_idx on public.profiles(role);

-- ---------------------------------------------------------------------------
-- members (the households / patients an ASHA is responsible for)
-- ---------------------------------------------------------------------------
create table if not exists public.members (
  id                  uuid primary key default gen_random_uuid(),
  member_code         text not null unique,
  full_name           text not null,
  age                 numeric(5,2) not null check (age >= 0 and age <= 130),
  gender              text not null check (gender in ('male','female','other')),
  phone               text,
  village             text,
  address             text,
  pregnancy_status    text not null default 'not_applicable'
                        check (pregnancy_status in ('not_applicable','pregnant','postnatal','lactating')),
  health_category     text not null default 'general'
                        check (health_category in ('general','pregnant','postnatal','child','chronic','elderly')),
  existing_conditions text[] not null default '{}',
  allergies           text[] not null default '{}',
  high_risk           boolean not null default false,
  asha_id             uuid references public.profiles(id) on delete set null,
  latitude            double precision,
  longitude           double precision,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists members_asha_id_idx on public.members(asha_id);
create index if not exists members_category_idx on public.members(health_category);
create index if not exists members_name_idx on public.members using gin (to_tsvector('simple', full_name));

-- ---------------------------------------------------------------------------
-- visits
-- ---------------------------------------------------------------------------
create table if not exists public.visits (
  id                 uuid primary key default gen_random_uuid(),
  member_id          uuid not null references public.members(id) on delete cascade,
  asha_id            uuid not null references public.profiles(id) on delete restrict,
  visit_date         timestamptz not null default now(),
  visit_type         text not null default 'home_visit'
                       check (visit_type in ('home_visit','follow_up','antenatal','postnatal','child_check')),
  status             visit_status not null default 'draft',
  transcript         text,
  language           text not null default 'en' check (language in ('en','hi','mr')),
  clinical_summary   text,
  triage_level       triage_level,
  triage_reason      text,
  recommended_action text,
  referral_required  boolean not null default false,
  referral_urgency   referral_urgency,
  follow_up_date     date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists visits_member_idx on public.visits(member_id);
create index if not exists visits_asha_idx on public.visits(asha_id);
create index if not exists visits_date_idx on public.visits(visit_date desc);
create index if not exists visits_triage_idx on public.visits(triage_level);

-- ---------------------------------------------------------------------------
-- symptoms
-- ---------------------------------------------------------------------------
create table if not exists public.symptoms (
  id           uuid primary key default gen_random_uuid(),
  visit_id     uuid not null references public.visits(id) on delete cascade,
  symptom_name text not null,
  category     text not null default 'general',
  severity     text check (severity in ('mild','moderate','severe')),
  duration     text,
  source       symptom_source not null default 'manual',
  created_at   timestamptz not null default now(),
  unique (visit_id, symptom_name)
);

create index if not exists symptoms_visit_idx on public.symptoms(visit_id);

-- ---------------------------------------------------------------------------
-- vitals
-- ---------------------------------------------------------------------------
create table if not exists public.vitals (
  id               uuid primary key default gen_random_uuid(),
  visit_id         uuid not null unique references public.visits(id) on delete cascade,
  temperature      numeric(4,1),
  pulse            integer,
  respiratory_rate integer,
  spo2             integer,
  systolic_bp      integer,
  diastolic_bp     integer,
  weight           numeric(5,1),
  blood_glucose    integer,
  recorded_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- assessments
-- ---------------------------------------------------------------------------
create table if not exists public.assessments (
  id                 uuid primary key default gen_random_uuid(),
  visit_id           uuid not null references public.visits(id) on delete cascade,
  ai_summary         text,
  reasoning          jsonb not null default '[]'::jsonb,
  safety_findings    jsonb not null default '[]'::jsonb,
  risk               triage_level not null,
  ai_risk            triage_level,
  safety_override    boolean not null default false,
  recommended_action text,
  confidence         numeric(3,2),
  model_name         text,
  created_at         timestamptz not null default now()
);

create index if not exists assessments_visit_idx on public.assessments(visit_id);

-- ---------------------------------------------------------------------------
-- healthcare_facilities (curated directory; also used when Places is offline)
-- ---------------------------------------------------------------------------
create table if not exists public.healthcare_facilities (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  facility_type  facility_type not null,
  address        text,
  latitude       double precision not null,
  longitude      double precision not null,
  phone          text,
  district       text,
  state          text,
  has_emergency  boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (name, latitude, longitude)
);

create index if not exists facilities_type_idx on public.healthcare_facilities(facility_type);

-- ---------------------------------------------------------------------------
-- referrals
-- ---------------------------------------------------------------------------
create table if not exists public.referrals (
  id                 uuid primary key default gen_random_uuid(),
  visit_id           uuid not null references public.visits(id) on delete cascade,
  member_id          uuid not null references public.members(id) on delete cascade,
  asha_id            uuid not null references public.profiles(id) on delete restrict,
  triage_level       triage_level not null,
  urgency            referral_urgency not null default 'routine',
  reason             text not null,
  referral_note      text not null,
  facility_id        uuid references public.healthcare_facilities(id) on delete set null,
  facility_name      text,
  facility_address   text,
  facility_latitude  double precision,
  facility_longitude double precision,
  facility_distance  numeric(6,2),
  status             referral_status not null default 'pending',
  reviewed_by        uuid references public.profiles(id) on delete set null,
  review_notes       text,
  created_at         timestamptz not null default now(),
  acknowledged_at    timestamptz,
  reviewed_at        timestamptz
);

create index if not exists referrals_status_idx on public.referrals(status);
create index if not exists referrals_triage_idx on public.referrals(triage_level);
create index if not exists referrals_created_idx on public.referrals(created_at desc);
create unique index if not exists referrals_visit_unique on public.referrals(visit_id);

-- ---------------------------------------------------------------------------
-- visit_events (audit trail)
-- ---------------------------------------------------------------------------
create table if not exists public.visit_events (
  id         uuid primary key default gen_random_uuid(),
  visit_id   uuid not null references public.visits(id) on delete cascade,
  actor_id   uuid references public.profiles(id) on delete set null,
  event_type text not null,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists visit_events_visit_idx on public.visit_events(visit_id, created_at);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists members_touch on public.members;
create trigger members_touch before update on public.members
  for each row execute function public.touch_updated_at();

drop trigger if exists visits_touch on public.visits;
create trigger visits_touch before update on public.visits
  for each row execute function public.touch_updated_at();

drop trigger if exists facilities_touch on public.healthcare_facilities;
create trigger facilities_touch before update on public.healthcare_facilities
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- SECURITY DEFINER helpers avoid recursive policy evaluation on `profiles`.
create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.current_role_name()
returns text language sql stable security definer set search_path = public as $$
  select role::text from public.profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.is_clinician()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role in ('phc_doctor','admin') from public.profiles where auth_user_id = auth.uid() limit 1),
    false);
$$;

grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.current_role_name() to authenticated;
grant execute on function public.is_clinician() to authenticated;

alter table public.profiles              enable row level security;
alter table public.members               enable row level security;
alter table public.visits                enable row level security;
alter table public.symptoms              enable row level security;
alter table public.vitals                enable row level security;
alter table public.assessments           enable row level security;
alter table public.referrals             enable row level security;
alter table public.healthcare_facilities enable row level security;
alter table public.visit_events          enable row level security;

-- ------------------------------------------------------------------ profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (auth_user_id = auth.uid() or public.is_clinician());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

-- ASHA profiles must be visible to PHC (referral queue shows the worker name),
-- and each ASHA needs to read the PHC contact. Covered by is_clinician() above
-- plus this narrow read of clinician contact details:
drop policy if exists profiles_select_clinicians on public.profiles;
create policy profiles_select_clinicians on public.profiles for select to authenticated
  using (role in ('phc_doctor','admin'));

-- ------------------------------------------------------------------- members
drop policy if exists members_select on public.members;
create policy members_select on public.members for select to authenticated
  using (asha_id = public.current_profile_id() or public.is_clinician());

drop policy if exists members_insert on public.members;
create policy members_insert on public.members for insert to authenticated
  with check (asha_id = public.current_profile_id() or public.is_clinician());

drop policy if exists members_update on public.members;
create policy members_update on public.members for update to authenticated
  using (asha_id = public.current_profile_id() or public.is_clinician())
  with check (asha_id = public.current_profile_id() or public.is_clinician());

-- -------------------------------------------------------------------- visits
drop policy if exists visits_select on public.visits;
create policy visits_select on public.visits for select to authenticated
  using (asha_id = public.current_profile_id() or public.is_clinician());

drop policy if exists visits_insert on public.visits;
create policy visits_insert on public.visits for insert to authenticated
  with check (asha_id = public.current_profile_id());

drop policy if exists visits_update on public.visits;
create policy visits_update on public.visits for update to authenticated
  using (asha_id = public.current_profile_id() or public.is_clinician())
  with check (asha_id = public.current_profile_id() or public.is_clinician());

drop policy if exists visits_delete on public.visits;
create policy visits_delete on public.visits for delete to authenticated
  using (asha_id = public.current_profile_id() and status = 'draft');

-- Child tables inherit access from their parent visit.
create or replace function public.can_access_visit(v uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.visits
    where id = v
      and (asha_id = public.current_profile_id() or public.is_clinician())
  );
$$;
grant execute on function public.can_access_visit(uuid) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['symptoms','vitals','assessments','visit_events'] loop
    execute format('drop policy if exists %1$s_rw on public.%1$s', t);
    execute format(
      'create policy %1$s_rw on public.%1$s for all to authenticated
         using (public.can_access_visit(visit_id))
         with check (public.can_access_visit(visit_id))', t);
  end loop;
end $$;

-- ----------------------------------------------------------------- referrals
drop policy if exists referrals_select on public.referrals;
create policy referrals_select on public.referrals for select to authenticated
  using (asha_id = public.current_profile_id() or public.is_clinician());

drop policy if exists referrals_insert on public.referrals;
create policy referrals_insert on public.referrals for insert to authenticated
  with check (asha_id = public.current_profile_id());

drop policy if exists referrals_update on public.referrals;
create policy referrals_update on public.referrals for update to authenticated
  using (asha_id = public.current_profile_id() or public.is_clinician())
  with check (asha_id = public.current_profile_id() or public.is_clinician());

-- ------------------------------------------------------- facilities (read-only)
drop policy if exists facilities_select on public.healthcare_facilities;
create policy facilities_select on public.healthcare_facilities for select to authenticated
  using (true);

drop policy if exists facilities_write on public.healthcare_facilities;
create policy facilities_write on public.healthcare_facilities for all to authenticated
  using (public.current_role_name() = 'admin')
  with check (public.current_role_name() = 'admin');

-- =============================================================================
-- Realtime — PHC dashboard subscribes to urgent referrals
-- =============================================================================
alter table public.referrals replica identity full;
alter table public.visits    replica identity full;

do $$ begin
  alter publication supabase_realtime add table public.referrals;
exception when duplicate_object then null; when undefined_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.visits;
exception when duplicate_object then null; when undefined_object then null; end $$;
