# Presente

Listas de presença digitais das Capacitações do Instituto Cuidare: Next.js 16 (App Router) + Supabase + Cloudflare Workers (OpenNext). A equipe e os voluntários falam português, e todo texto de interface, mensagem de erro e commit também é em português.

## Onde consultar

- **Vocabulário**: [CONTEXT.md](CONTEXT.md). Use estes termos ao nomear telas, funções, testes e mensagens (Capacitação, Presença, Janela de Assinatura, Instituição Beneficiada…).
- **Por que é assim**: [docs/adr/](docs/adr/). Leia antes de mexer em hospedagem, acesso ao banco, formato do Documento da Lista, login ou nos dados da escola/CNPJ.
- **Next.js 16**: as APIs mudaram (`proxy.ts` no lugar de middleware, `params` assíncrono). Confira em `node_modules/next/dist/docs/` antes de usar uma API do Next de memória.

## Segredos

`SUPABASE_SECRET_KEY` e `TURNSTILE_SECRET_KEY` dão acesso aos CPFs. Trate como senha: referencie sempre pelo nome da variável, leia o valor de `.env.local` dentro de scripts e deixe fora de código, Git, logs e respostas. O código que usa a chave secreta fica em módulos com `import 'server-only'` (`lib/supabase/admin.ts`).

Para tarefas de conta (trocar chave, Turnstile, novo usuário da equipe, migração), use o assistente: `npm run assistente -- chave | turnstile | equipe | migracao | formulario`. Assim a pessoa digita os segredos escondidos no terminal, e não na conversa.

## Banco de dados

- Mudança de esquema vira um arquivo novo em `supabase/migrations/NNNN_descricao.sql`, **aditivo** (colunas novas opcionais), para a versão no ar continuar funcionando. A pessoa roda o arquivo no Supabase **antes** de você publicar o código que depende dele.
- Tabela nova: RLS ligado, políticas só para `public.is_staff()` e nenhuma permissão para `anon`. O que o público precisa gravar passa por ação no servidor com o cliente admin (ADR 0001).
- `npm run dev` usa o banco de produção. Dados de teste levam "teste" no nome e são apagados ao terminar.

## Código

- Regras de negócio ficam em módulos puros de `lib/` (`format`, `presenca`, `planilha`, `docx-lista`), testados em `tests/` com Vitest. Páginas, rotas e ações só buscam dados e chamam essas regras.
- Mudança numa regra de negócio começa por um teste que falha.
- O visual (paleta Contraste: preto, branco e rosa `#FFC4D6`, e os efeitos de caneta) está em `app/globals.css`. Reutilize as classes existentes.

## Publicar

Cada passo só avança quando o anterior terminou:

1. `npm test` e `npm run typecheck` sem falhas.
2. Migrações novas já rodadas no Supabase pela pessoa.
3. `npm run listas-abertas` mostra nenhuma Lista de Presença recebendo assinaturas, porque um voluntário com o formulário aberto perde o envio durante a troca.
4. `npx opennextjs-cloudflare build && npx wrangler deploy`.
5. `https://presente.presente.workers.dev/api/saude` responde 200, ou seja, o site publicado alcança o banco.
6. Commit descrevendo a mudança. Se algo quebrar no ar, `npx wrangler rollback` volta para a versão anterior.
