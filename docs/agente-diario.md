# Agente diário do Presente

Instruções para o agente que roda todo dia às 06:00 (horário de Brasília) numa rotina do Claude Code na nuvem,
com uma cópia deste repositório. Leia também o [AGENTS.md](../AGENTS.md) antes de mexer em qualquer coisa.

## O que você pode e o que não pode

Você **pode**: ler o código, rodar `npm ci`, `npm test`, `npm run typecheck` e `npm audit`, ler o resumo público
da Saúde do sistema e propor correções em ramos `agente/…`.

Você **nunca**: mexe no `main`, publica o site (`wrangler`, `opennextjs-cloudflare`), cria ou altera migrações
(`supabase/migrations`), mexe em `wrangler.jsonc`, `proxy.ts`, segredos ou arquivos `.env*`, roda `npm run dev`,
`npm run backup` ou qualquer script que use o banco. Você não tem as chaves do banco e não deve pedir.
Na dúvida, não mude: descreva no relato.

## Rotina

1. **Preparar:** `npm ci`.
2. **Conferir o código:** `npm test`, `npm run typecheck`, `npm audit --omit=dev`. Anote o que falhar.
3. **Ler o estado do site:**
   `curl -s https://presente.presente.workers.dev/api/saude` (o site alcança o banco?) e
   `curl -s https://presente.presente.workers.dev/api/saude/resumo` (situação de cada verificação de hora em hora).
   Verificação em `atencao` ou `falha` costuma ser tarefa da Equipe (backup, documento, cobrança), não defeito de código:
   só trate como defeito se o código estiver errado.
4. **Revisar o que mudou:** `git log --since="2 days ago" --stat` e leia as alterações recentes procurando defeitos
   (regra de negócio errada, erro do banco ignorado, texto de interface errado, falta de teste em regra nova).
5. **Corrigir no máximo 2 defeitos reais por dia**, os mais importantes. Para cada um:
   - crie o ramo `agente/AAAA-MM-DD-descricao-curta` a partir do `main`;
   - escreva primeiro um teste em `tests/` que falha por causa do defeito (regra do AGENTS.md);
   - faça a menor correção que faz o teste passar; rode `npm test` e `npm run typecheck` de novo;
   - um commit só, em português. **A primeira linha do commit é o título que a Equipe vai ler** na tela
     Saúde do sistema (ex.: "Relatório não abre quando a escola está sem patrocinador"); o corpo explica,
     em linguagem simples, o que estava errado, como o teste prova e o que a correção muda.
     Não acrescente linhas de coautoria;
   - envie o ramo (`git push origin agente/…`). Se conseguir, abra um pull request para o `main` com o mesmo texto.
   O site encontra o ramo sozinho, na hora cheia seguinte, e mostra "Aguarda você" na tela Saúde do sistema.
6. **Não invente trabalho.** Sem defeito real, não crie ramo. Não reformate código, não troque dependências,
   não mexa no visual.

## Relato final

Termine com um relato curto em português, para a Equipe (não técnico):

- **Conferido:** testes, tipos, dependências e situação do site.
- **Encontrado:** o que estava fora do normal, ou "nada fora do normal".
- **Feito:** ramos criados (nome e o que corrigem) ou "nenhuma correção hoje".
- **Para a Equipe:** o que só uma pessoa pode fazer (por exemplo, "o backup está atrasado").
