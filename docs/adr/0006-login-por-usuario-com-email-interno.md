# Login por nome de usuário, com e-mail interno @presente.app

A equipe entra digitando só o usuário (ex.: `maria`). O sistema completa para `maria@presente.app`, que é a conta real no Supabase Auth. Esse e-mail não recebe mensagens. A autorização vem da tabela `staff` (por e-mail), e o cadastro público fica desligado. Escolhemos isso em vez de e-mail real com link mágico porque o provedor de e-mail gratuito do Supabase só envia para membros da organização, e em vez de um "link de acesso" permanente porque um link vazado daria acesso aos CPFs (esse recurso chegou a ser feito e foi removido).

## Consequences

- Recuperar senha por e-mail não funciona para esses usuários. Quem administra o Supabase precisa redefinir a senha pelo painel do Supabase.
- Quem digitar um e-mail completo também consegue entrar, então pessoas com e-mail real podem ser adicionadas do mesmo jeito.
