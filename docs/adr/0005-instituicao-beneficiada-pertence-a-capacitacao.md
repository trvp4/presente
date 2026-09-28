# Instituição Beneficiada, CNPJ e cidade pertencem à Capacitação, não ao Projeto

O CNPJ que aparece no Documento da Lista é da Instituição Beneficiada (a escola que recebe o Projeto), não do Projeto. Um mesmo Projeto vai a várias escolas e cidades, então esses três dados são informados em cada Capacitação. O Projeto guarda só nome, Pronac e logo. A Realizadora é fixa (Instituto Cuidare) e não fica no banco.

## Consequences

- As colunas `cnpj` e `city` de `projects` ficaram obsoletas (opcionais) e só existem para não perder dados antigos.
- Para não redigitar, a criação de Capacitação sugere Instituições já usadas antes e preenche CNPJ e cidade.
