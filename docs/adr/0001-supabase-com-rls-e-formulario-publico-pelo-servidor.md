# Supabase com RLS, e o formulário público grava só pelo servidor

Usamos o Supabase (Postgres, login e tempo real) com RLS em todas as tabelas, liberando leitura e escrita apenas para quem está na tabela `staff`. Visitantes anônimos não têm **nenhuma** permissão no banco. O Voluntário não fala com o banco: o formulário chama uma ação no servidor, que valida tudo (CPF, Assinatura, Consentimento, Janela de Assinatura, limites) e grava com a chave secreta. Escolhemos isso em vez de uma política de `insert` para anônimos porque as regras de negócio (Janela de Assinatura, teto por lista, anti-robô) não cabem bem em RLS, e porque a chave pública fica no navegador: qualquer permissão anônima seria usável direto pela API, sem passar pelo formulário.

## Consequences

- A chave secreta (`SUPABASE_SECRET_KEY`) é o ativo mais sensível do sistema: ela dá acesso a todos os CPFs. Fica só em `.env.local`/`.dev.vars` e como secret da Cloudflare, nunca no Git nem no navegador.
- Qualquer nova tela pública precisa passar por uma ação no servidor. Não adianta criar política anônima.
