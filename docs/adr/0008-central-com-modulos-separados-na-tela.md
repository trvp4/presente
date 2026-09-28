# Central com dois módulos separados na tela e ligados nos dados

A tela inicial (`/`) é a Central: duas "portas", Presente (rosa) e Espaços de Leitura (lilás), cada uma com os próprios números e pendências. Dentro de um módulo, a barra lateral mostra só os itens dele, com "Voltar à Central" no topo. O módulo sai do endereço: `/espacos/*` é Espaços de Leitura, e o resto do painel é o Presente (`RailNav.tsx`). Por isso as Listas de Presença saíram de `/` e foram para `/listas`. Uma primeira versão com uma lista única de tarefas misturando os dois módulos foi rejeitada pela Equipe: quem trabalha no acompanhamento mensal não quer ver as listas de presença no caminho, e vice-versa.

Login, escolas (`schools`) e projetos são compartilhados. O cruzamento só aparece onde ajuda e sempre sinalizado, como a etiqueta "vindo do Presente" no relatório do patrocinador.

## Consequences

- Links antigos para `/` levam à Central, e não mais às listas. A lista de presença pública (`/p/…`) não mudou.
- Um módulo novo precisa de um prefixo de endereço próprio, uma cor e uma porta na Central.
