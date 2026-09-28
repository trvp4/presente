-- Plano de capacitações (planilha "Capacitações 2026"): o que está previsto, por projeto e patrocinador.
-- Cada item é para uma escola (como a Lista de Presença) e, quando a lista é criada no Presente,
-- fica ligado a ela (training_id): a presença assinada confirma a participação da escola.
-- Tabela nova (migração aditiva). Rode este arquivo inteiro no SQL Editor do Supabase, uma vez.

create table public.plano_capacitacoes (
  id            uuid primary key default gen_random_uuid(),
  origem_id     text unique,                                -- id da carga (CAP-…), para recarregar sem duplicar
  project_id    uuid not null references public.projects (id),
  school_id     uuid references public.schools (id) on delete set null,
  training_id   uuid unique references public.trainings (id) on delete set null,
  patrocinador  text,
  tipo          text not null check (length(trim(tipo)) > 0),
  modo          text,                                       -- Online / Presencial
  publico       text,
  cidade        text,
  data_prevista date,
  hora          text check (hora is null or hora ~ '^[0-9]{2}:[0-9]{2}$'),
  data_realizada date,
  situacao      text not null default 'planejada' check (situacao in ('planejada', 'realizada', 'cancelada')),
  responsavel   text,
  horas         numeric check (horas is null or horas > 0),
  observacoes   text,
  created_at    timestamptz not null default now()
);
create index plano_capacitacoes_project_idx on public.plano_capacitacoes (project_id);
create index plano_capacitacoes_school_idx on public.plano_capacitacoes (school_id);

alter table public.plano_capacitacoes enable row level security;
create policy "equipe gerencia o plano" on public.plano_capacitacoes
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

revoke all on public.plano_capacitacoes from anon, authenticated;
grant select, insert, update, delete on public.plano_capacitacoes to authenticated;
grant all on public.plano_capacitacoes to service_role;
