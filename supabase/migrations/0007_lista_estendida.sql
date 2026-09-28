-- Lista estendida: a lista pode aceitar assinaturas por 48 h, 72 h ou 7 dias a partir do início do
-- encontro, para quem só consegue ver o material depois (à noite). Vazio = só o horário do encontro.
-- Coluna nova e opcional: a versão no ar continua funcionando.
-- Rode este arquivo no SQL Editor do Supabase, uma vez.
alter table public.trainings
  add column keep_open_hours integer check (keep_open_hours is null or keep_open_hours in (48, 72, 168));
