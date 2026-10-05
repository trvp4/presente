-- Registro de acesso (LGPD): quem baixou ou abriu dados com CPF completo (Word, planilha, impressão),
-- removeu uma assinatura ou excluiu uma lista. Só acrescenta: ninguém da Equipe edita nem apaga.
-- Cada pessoa só registra em nome dela mesma (o e-mail do login). Tabela nova (migração aditiva).
-- Rode este arquivo inteiro no SQL Editor do Supabase, uma vez.

create table public.registro_acesso (
  id           bigint generated always as identity primary key,
  quando       timestamptz not null default now(),
  quem         text not null,
  acao         text not null check (acao in ('documento', 'planilha', 'impressao', 'remocao_assinatura', 'exclusao_lista')),
  training_id  uuid,                 -- sem chave estrangeira: o registro continua depois de a lista ser excluída
  lista_titulo text,
  detalhe      text
);
create index registro_acesso_quando_idx on public.registro_acesso (quando desc);
create index registro_acesso_training_idx on public.registro_acesso (training_id);

alter table public.registro_acesso enable row level security;
create policy "equipe lê o registro" on public.registro_acesso
  for select to authenticated using ((select public.is_staff()));
create policy "equipe registra em nome próprio" on public.registro_acesso
  for insert to authenticated
  with check ((select public.is_staff()) and quem = lower((select auth.jwt() ->> 'email')));

revoke all on public.registro_acesso from anon, authenticated;
grant select, insert on public.registro_acesso to authenticated;
grant all on public.registro_acesso to service_role;
