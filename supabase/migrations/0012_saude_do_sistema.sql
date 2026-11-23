-- Saúde do sistema (tela /saude): conferências de hora em hora, achados e eventos de manutenção.
-- Tabelas novas (migração aditiva). Rode este arquivo inteiro no SQL Editor do Supabase, uma vez.
--
-- saude_rodadas: uma linha por conferência (tarefa de hora em hora ou botão "Conferir agora"),
--                com o resultado de cada verificação. É o histórico dos últimos 30 dias da tela.
-- achados:       o que precisa de atenção. Abertos e resolvidos sozinhos pelas verificações; depois,
--                também pelo agente diário. A Equipe marca como resolvido, ignorado ou reabre.
-- saude_eventos: manutenção feita fora do site (por enquanto, o backup do `npm run backup`).

create table public.saude_rodadas (
  id         bigint generated always as identity primary key,
  quando     timestamptz not null default now(),
  origem     text not null check (origem in ('agendada', 'manual')),
  ms_banco   integer,                       -- tempo de resposta do banco nesta conferência
  resultado  jsonb not null default '[]'    -- [{ chave, nome, status, valor, detalhe }]
);
create index saude_rodadas_quando_idx on public.saude_rodadas (quando desc);

create table public.achados (
  id            text primary key,           -- ACH-<verificação> para os automáticos
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  gravidade     text not null check (gravidade in ('P1', 'P2', 'P3')),
  titulo        text not null,
  detalhe       text,
  categoria     text not null,
  estado        text not null default 'aberto' check (estado in ('aberto', 'aguarda_voce', 'resolvido', 'ignorado')),
  acao          text,                       -- o que fazer, em uma frase
  origem        text not null default 'verificacao' check (origem in ('verificacao', 'agente', 'manual')),
  verificacao   text,                       -- chave da verificação que abriu o achado
  resolvido_em  timestamptz,
  resolvido_por text
);
create index achados_estado_idx on public.achados (estado);

create table public.saude_eventos (
  id      bigint generated always as identity primary key,
  quando  timestamptz not null default now(),
  tipo    text not null check (tipo in ('backup')),
  detalhe text
);
create index saude_eventos_tipo_idx on public.saude_eventos (tipo, quando desc);

alter table public.saude_rodadas enable row level security;
alter table public.achados enable row level security;
alter table public.saude_eventos enable row level security;

-- A Equipe lê tudo; só muda o estado dos achados. Quem grava as conferências é o servidor (chave secreta).
create policy "equipe lê as rodadas" on public.saude_rodadas for select to authenticated using ((select public.is_staff()));
create policy "equipe lê os achados" on public.achados for select to authenticated using ((select public.is_staff()));
create policy "equipe muda o estado dos achados" on public.achados for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "equipe lê os eventos" on public.saude_eventos for select to authenticated using ((select public.is_staff()));

revoke all on public.saude_rodadas, public.achados, public.saude_eventos from anon, authenticated;
grant select on public.saude_rodadas, public.saude_eventos to authenticated;
grant select, update (estado, atualizado_em, resolvido_em, resolvido_por) on public.achados to authenticated;
grant all on public.saude_rodadas, public.achados, public.saude_eventos to service_role;
