-- Central · módulo Espaços de Leitura (migração aditiva: nada existente muda de comportamento).
--   • schools: cadastro único de escolas (Instituição Beneficiada), compartilhado com o Presente.
--     O CNPJ é opcional e único: a escola ganha o CNPJ quando aparece numa lista do Presente (ADR 0007).
--   • projects ganha os campos que o acompanhamento usa.
--   • el_*: tabelas do acompanhamento mensal. Guardam só o que a escola enviou e o que a Equipe
--     decidiu; situação, totais e pendências são recalculados pelas regras (lib/espacos/regras.ts).
-- Rode este arquivo inteiro no SQL Editor do Supabase, uma vez.

-- ---------------------------------------------------------------
-- Escolas (compartilhado)
-- ---------------------------------------------------------------
create table public.schools (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null check (length(trim(nome)) > 0),
  apelidos     text,                                   -- outras formas do nome, separadas por |
  cnpj         text unique check (cnpj is null or cnpj ~ '^[0-9]{14}$'),
  cidade       text,                                   -- "Recife – PE" (mesmo formato do Presente)
  contato_nome text,
  telefone     text,
  email        text,
  situacao     text not null default 'ativa' check (situacao in ('ativa', 'inativa')),
  observacoes  text,
  created_at   timestamptz not null default now()
);

-- lista do Presente → escola (opcional; as colunas beneficiary_* continuam valendo)
alter table public.trainings add column school_id uuid references public.schools (id) on delete set null;
create index trainings_school_idx on public.trainings (school_id);

-- escolas que já aparecem em listas do Presente (com CNPJ) entram no cadastro e ficam ligadas
insert into public.schools (nome, cnpj, cidade)
select distinct on (beneficiary_cnpj) beneficiary_name, beneficiary_cnpj, city
  from public.trainings
 where beneficiary_cnpj is not null and beneficiary_name is not null
 order by beneficiary_cnpj, created_at desc
on conflict (cnpj) do nothing;

update public.trainings t
   set school_id = s.id
  from public.schools s
 where s.cnpj = t.beneficiary_cnpj and t.school_id is null;

-- ---------------------------------------------------------------
-- Projetos (compartilhado): campos do acompanhamento
-- ---------------------------------------------------------------
alter table public.projects
  add column nomes_no_formulario text,   -- como o projeto aparece no Google Forms, separados por |
  add column tipo_espaco text;

-- ---------------------------------------------------------------
-- Espaços de Leitura
-- ---------------------------------------------------------------
-- Vínculo: escola × projeto, a unidade que responde todo mês
create table public.el_vinculos (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools (id),
  project_id   uuid not null references public.projects (id),
  patrocinador text,
  inicio       text check (inicio is null or inicio ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),  -- AAAA-MM
  fim          text check (fim is null or fim ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  acompanhar   boolean not null default true,
  contato_responsavel text,
  observacoes  text,
  created_at   timestamptz not null default now(),
  unique (school_id, project_id),
  check (fim is null or inicio is null or fim >= inicio)
);
create index el_vinculos_project_idx on public.el_vinculos (project_id);

-- Ciclo: um mês de acompanhamento
create table public.el_ciclos (
  id          text primary key check (id ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),  -- AAAA-MM
  prazo       date,
  situacao    text not null default 'aberto' check (situacao in ('aberto', 'encerrado')),
  observacoes text,
  created_at  timestamptz not null default now()
);

-- Resposta mensal: o que a escola enviou (preservado como veio) + a revisão da Equipe
create table public.el_respostas (
  id                  text primary key,          -- F-AAAAMMDDHHMMSS-xxxx (mesmo envio → mesmo id)
  origem              text not null default 'formulário' check (origem in ('formulário', 'planilha antiga')),
  referencia_origem   text,
  hash_origem         text not null,
  carimbo             timestamptz,
  email_respondente   text,
  projeto_informado   text,
  escola_informada    text,
  mes_informado       text,
  visitas_texto text, emprestimos_texto text, atividades_texto text, faixa_uso_texto text,
  perc_atrativa text, perc_encontra text, perc_desempenho text, perc_integracao text, perc_comunidade text,
  atores text, rede text, potenciais text, desafios text, cronograma text, atividades_turmas text,
  atividade_mais_realizada text, faixa_etaria text, fora_cronograma text, planejadas text, boas_praticas text,
  alfabetizacao text, impacto_comunidade text, melhorias text, anexos text,
  -- revisão da Equipe (nunca sobrescrita por um reenvio da escola)
  vinculo_manual         uuid references public.el_vinculos (id),
  mes_manual             text check (mes_manual is null or mes_manual ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  visitas_corrigidas     numeric check (visitas_corrigidas >= 0),
  emprestimos_corrigidos numeric check (emprestimos_corrigidos >= 0),
  eventos_corrigidos     numeric check (eventos_corrigidos >= 0),
  decisao                text check (decisao in ('aceitar', 'descartar')),
  nota_revisao           text,
  revisado_por           text,
  revisado_em            timestamptz,
  recebido_em            timestamptz not null default now()
);
create index el_respostas_vinculo_manual_idx on public.el_respostas (vinculo_manual);
create index el_respostas_carimbo_idx on public.el_respostas (carimbo desc);

-- Dispensa de uma obrigação (vínculo × ciclo). A obrigação em si é calculada pelas regras.
create table public.el_dispensas (
  ciclo_id    text not null references public.el_ciclos (id),
  vinculo_id  uuid not null references public.el_vinculos (id),
  motivo      text not null check (length(trim(motivo)) > 0),
  registrado_por text,
  created_at  timestamptz not null default now(),
  primary key (ciclo_id, vinculo_id)
);
create index el_dispensas_vinculo_idx on public.el_dispensas (vinculo_id);

-- Contatos da Equipe com a escola (cobranças e conversas)
create table public.el_contatos (
  id          uuid primary key default gen_random_uuid(),
  ciclo_id    text not null references public.el_ciclos (id),
  vinculo_id  uuid not null references public.el_vinculos (id),
  data        timestamptz not null default now(),
  canal       text,
  responsavel text,
  resultado   text,
  observacao  text
);
create index el_contatos_obrigacao_idx on public.el_contatos (ciclo_id, vinculo_id);
create index el_contatos_vinculo_idx on public.el_contatos (vinculo_id);

-- Fechamento: versões do resultado de um ciclo encerrado (nunca apagadas)
create table public.el_fechamentos (
  id            uuid primary key default gen_random_uuid(),
  ciclo_id      text not null references public.el_ciclos (id),
  versao        integer not null check (versao > 0),
  registrado_em timestamptz not null default now(),
  esperadas integer not null, respondidas integer not null, em_revisao integer not null,
  pendentes integer not null, dispensadas integer not null, taxa_resposta numeric,
  visitas numeric not null, emprestimos numeric not null, eventos numeric not null,
  assinatura    text not null,
  unique (ciclo_id, versao)
);

-- ---------------------------------------------------------------
-- Segurança: só a Equipe (tabela staff) lê e escreve. Nada para anônimos.
-- As respostas do Forms entram pelo servidor com a chave secreta (ADR 0001).
-- ---------------------------------------------------------------
alter table public.schools        enable row level security;
alter table public.el_vinculos    enable row level security;
alter table public.el_ciclos      enable row level security;
alter table public.el_respostas   enable row level security;
alter table public.el_dispensas   enable row level security;
alter table public.el_contatos    enable row level security;
alter table public.el_fechamentos enable row level security;

create policy "equipe gerencia escolas" on public.schools
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "equipe gerencia vínculos" on public.el_vinculos
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "equipe gerencia ciclos" on public.el_ciclos
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "equipe revisa respostas" on public.el_respostas
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "equipe gerencia dispensas" on public.el_dispensas
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "equipe registra contatos" on public.el_contatos
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "equipe lê fechamentos" on public.el_fechamentos
  for select to authenticated using ((select public.is_staff()));
create policy "equipe registra fechamentos" on public.el_fechamentos
  for insert to authenticated with check ((select public.is_staff()));

revoke all on public.schools, public.el_vinculos, public.el_ciclos, public.el_respostas,
  public.el_dispensas, public.el_contatos, public.el_fechamentos from anon;
grant select, insert, update, delete on public.schools, public.el_vinculos, public.el_ciclos,
  public.el_respostas, public.el_dispensas, public.el_contatos to authenticated;
grant select, insert on public.el_fechamentos to authenticated;   -- versões nunca mudam nem somem
grant all on public.schools, public.el_vinculos, public.el_ciclos, public.el_respostas,
  public.el_dispensas, public.el_contatos, public.el_fechamentos to service_role;
