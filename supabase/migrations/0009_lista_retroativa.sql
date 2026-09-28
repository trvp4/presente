-- Lista criada depois do encontro (ex.: capacitação do plano que aconteceu sem lista): recebe assinaturas
-- até open_until (criação + prazo escolhido, 48 h por padrão) e fecha sozinha. Vazio = segue o horário.
-- Coluna nova e opcional: a versão no ar continua funcionando.
-- Rode este arquivo no SQL Editor do Supabase, uma vez.
alter table public.trainings add column open_until timestamptz;
