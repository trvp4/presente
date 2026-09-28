-- Avaliação da formação (Google Forms "Avaliação - Formação de Professores"). Migração aditiva.
-- As respostas entram pelo servidor (script do Forms → /api/avaliacao/formulario, chave secreta);
-- a Equipe só lê (e pode apagar uma resposta de teste). O e-mail de quem respondeu não é guardado.
-- Rode este arquivo inteiro no SQL Editor do Supabase, uma vez.

create table public.av_respostas (
  id          text primary key,                 -- id da resposta no Google Forms
  carimbo     timestamptz,
  projeto     text not null,                    -- como veio no formulário
  respostas   jsonb not null default '{}',      -- { "título da pergunta": "resposta" }
  hash_origem text not null,
  recebido_em timestamptz not null default now()
);
create index av_respostas_projeto_idx on public.av_respostas (projeto);

alter table public.av_respostas enable row level security;
create policy "equipe lê avaliações" on public.av_respostas
  for select to authenticated using ((select public.is_staff()));
create policy "equipe apaga avaliações" on public.av_respostas
  for delete to authenticated using ((select public.is_staff()));

revoke all on public.av_respostas from anon, authenticated;
grant select, delete on public.av_respostas to authenticated;
grant all on public.av_respostas to service_role;
