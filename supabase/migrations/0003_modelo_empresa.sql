-- Ajustes para o modelo oficial da lista (Word da empresa):
-- • o projeto passa a ter logo (vai no topo do PDF);
-- • escola beneficiada, CNPJ da escola e cidade passam a ser de cada lista (capacitação).

alter table public.projects
  add column logo text check (logo is null or (logo like 'data:image/%' and length(logo) < 700000));

-- CNPJ e cidade saem do projeto (ficam opcionais só para não perder dados antigos)
alter table public.projects alter column cnpj drop not null;
alter table public.projects alter column city drop not null;

alter table public.trainings
  add column beneficiary_name text,
  add column beneficiary_cnpj text check (beneficiary_cnpj is null or beneficiary_cnpj ~ '^[0-9]{14}$'),
  add column city text;

-- listas já criadas herdam o CNPJ e a cidade que estavam no projeto
update public.trainings t
   set beneficiary_cnpj = p.cnpj,
       city = p.city
  from public.projects p
 where p.id = t.project_id and t.city is null;
