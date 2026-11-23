-- Espaços de Leitura: perguntas do formulário reformulado (em uso desde nov/2026).
-- Só colunas novas e opcionais: a versão no ar continua funcionando antes e depois.
-- Rode este arquivo no SQL Editor do Supabase, uma vez, ANTES de publicar o código que grava nelas.

alter table public.el_respostas
  add column if not exists ano_edicao               text,  -- "Qual o ano de edição?"
  add column if not exists ano_informado            text,  -- "De qual ano?" (completa o mês de referência)
  add column if not exists responsavel              text,  -- quem respondeu, nome e cargo
  add column if not exists gestao                   text,  -- como está a gestão do espaço no mês
  add column if not exists uso_no_mes               text,  -- "O Espaço de Leitura foi utilizado durante o mês?"
  add column if not exists estudantes_texto         text,  -- número aproximado de estudantes, como a escola escreveu
  add column if not exists formas_uso               text,
  add column if not exists temas                    text,
  add column if not exists emprestimos_faixa        text,  -- "Sim, de 11 a 30 livros"
  add column if not exists emprestimos_exato        text,  -- "número exato, se possível"
  add column if not exists emprestimos_prof         text,
  add column if not exists emprestimos_prof_titulos text,
  add column if not exists atividades_faixa         text,  -- "( ) 4 a 6"
  add column if not exists atividades_realizadas    text,
  add column if not exists livros_procurados        text,
  add column if not exists resultados               text,
  -- revisão da Equipe (nunca sobrescrita por um reenvio da escola)
  add column if not exists estudantes_corrigidos    numeric check (estudantes_corrigidos >= 0);

-- Resultado guardado de cada ciclo encerrado passa a ter estudantes atendidos (0 nos antigos)
alter table public.el_fechamentos
  add column if not exists estudantes numeric not null default 0;
