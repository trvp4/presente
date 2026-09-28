-- Projetos do Espaços de Leitura entram sem Pronac (as planilhas não têm). A lista de presença continua
-- exigindo Pronac: o painel só oferece projetos com Pronac e o servidor recusa lista de projeto sem ele.
-- O formato (5 a 7 números) continua valendo quando o Pronac é informado.
-- Rode este arquivo no SQL Editor do Supabase, uma vez.
alter table public.projects alter column pronac drop not null;
