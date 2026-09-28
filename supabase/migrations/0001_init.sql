-- Presente: listas de presença das capacitações de voluntários
-- Rode este arquivo inteiro no SQL Editor do Supabase (uma vez).

-- ---------------------------------------------------------------
-- Equipe autorizada a usar o painel
-- ---------------------------------------------------------------
create table public.staff (
  email text primary key check (email = lower(email)),
  name  text,
  created_at timestamptz not null default now()
);

-- true quando quem está logado está na tabela staff
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------------------------------------------------------------
-- Projetos (dados que vão no cabeçalho da lista)
-- ---------------------------------------------------------------
create table public.projects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  pronac     text not null check (pronac ~ '^[0-9]{5,7}$'),
  cnpj       text not null check (cnpj ~ '^[0-9]{14}$'),
  city       text not null check (length(trim(city)) > 0),
  archived   boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Capacitações (cada uma tem um link/QR de presença)
-- ---------------------------------------------------------------
create table public.trainings (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects (id) on delete restrict,
  title          text not null check (length(trim(title)) > 0),
  date           date not null,
  start_time     time not null,
  end_time       time not null check (end_time > start_time),
  instructor     text,
  expected_count integer not null default 20 check (expected_count > 0),
  code           text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  -- auto: abre 30 min antes do início e fecha 1 h depois do término
  -- open / closed: o gestor abriu ou encerrou manualmente
  state          text not null default 'auto' check (state in ('auto', 'open', 'closed')),
  pdf_sent_at    timestamptz,
  created_by     text default lower(auth.jwt() ->> 'email'),
  created_at     timestamptz not null default now()
);
create index trainings_date_idx on public.trainings (date desc);

-- ---------------------------------------------------------------
-- Presenças assinadas
-- ---------------------------------------------------------------
create table public.attendances (
  id          uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings (id) on delete cascade,
  full_name   text not null check (length(trim(full_name)) > 3),
  role        text not null check (length(trim(role)) > 0),
  cpf         text not null check (cpf ~ '^[0-9]{11}$'),
  signature   text not null check (signature like 'data:image/png;base64,%' and length(signature) < 400000),
  consent_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (training_id, cpf)
);
create index attendances_training_idx on public.attendances (training_id, created_at desc);

-- ---------------------------------------------------------------
-- Segurança (RLS): só a equipe lê e escreve.
-- O formulário público do voluntário grava pelo servidor (chave secreta),
-- então não existe nenhuma política para usuários anônimos.
-- ---------------------------------------------------------------
alter table public.staff       enable row level security;
alter table public.projects    enable row level security;
alter table public.trainings   enable row level security;
alter table public.attendances enable row level security;

create policy "equipe lê a equipe" on public.staff
  for select to authenticated using (public.is_staff());

create policy "equipe gerencia projetos" on public.projects
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "equipe gerencia capacitações" on public.trainings
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "equipe lê presenças" on public.attendances
  for select to authenticated using (public.is_staff());

create policy "equipe remove presenças" on public.attendances
  for delete to authenticated using (public.is_staff());

-- ---------------------------------------------------------------
-- Permissões da API (necessárias quando "Automatically expose new tables"
-- está desligado). Visitantes anônimos não recebem acesso a nada.
-- ---------------------------------------------------------------
revoke all on public.staff, public.projects, public.trainings, public.attendances from anon;
grant select on public.staff to authenticated;
grant select, insert, update, delete on public.projects, public.trainings to authenticated;
grant select, delete on public.attendances to authenticated;
grant all on public.staff, public.projects, public.trainings, public.attendances to service_role;
revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated, service_role;

-- Atualização ao vivo da lista no painel
alter publication supabase_realtime add table public.attendances;
