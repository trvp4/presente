# O Documento da Lista é um .docx gerado do zero, imitando o modelo em Word

A entrega oficial é em Word (.docx), no modelo do Instituto Cuidare, e não em PDF: a equipe pediu Word explicitamente. O arquivo é gerado do zero com a biblioteca `docx` (`lib/docx-lista.ts`), reproduzindo página A4, margens, Calibri 11, logo centralizado, campos em negrito e tabela numerada. Não preenchemos o arquivo modelo original porque isso exigiria manipular o XML do Word na Cloudflare e trocar a imagem do logo a cada Projeto. Gerar do zero é mais simples e aceita qualquer logo.

## Consequences

- Se o modelo oficial mudar, a mudança precisa ser refeita à mão em `lib/docx-lista.ts`. O modelo recebido está descrito lá.
- O modelo original tinha as colunas "NOME/CARGO" e "CONTATO". Por decisão da equipe, o documento usa **NOME/CARGO · CPF · ASSINATURA**.
- A página `/imprimir/[id]` (versão para PDF) continua existindo, mas não é o caminho oficial.
