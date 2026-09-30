-- Formulário novo "Acompanhamento Mensal :: Espaços de Leitura": perguntas novas guardadas como vieram.
-- Colunas novas e opcionais (migração aditiva): as respostas do formulário antigo continuam iguais.
-- Rode este arquivo inteiro no SQL Editor do Supabase, uma vez, ANTES de publicar a versão que o lê.

alter table public.el_respostas
  add column projeto_edicao text,                   -- "Qual o ano de edição?" (juntado ao projeto)
  add column responsavel_resposta text,             -- quem respondeu (nome e cargo)
  add column mes_ano text,                          -- "De qual ano?" (juntado ao mês)
  add column gestao text,                           -- gestão do espaço no mês
  add column uso_frequencia text,                   -- o espaço foi utilizado? (frequentemente / algumas vezes…)
  add column formas_uso text,
  add column temas text,
  add column emprestimos_faixa text,                -- faixa de empréstimos a estudantes (o número exato vai em emprestimos_texto)
  add column emprestimos_professores text,
  add column emprestimos_professores_titulos text,
  add column atividades_faixa text,                 -- faixa de atividades pedagógicas ("4 a 6")
  add column titulos_procurados text,
  add column resultados_mes text;                   -- resultados, destaques ou dificuldades (entra nos relatos)

-- No formulário novo o projeto vem como "ImpactaLab" + ano de edição; no cadastro ele é "Impacta Lab 2026/2027"
update public.projects
   set nomes_no_formulario = concat_ws(' | ', nullif(nomes_no_formulario, ''), 'ImpactaLab 2026', 'ImpactaLab 2027')
 where name = 'Impacta Lab 2026/2027';
