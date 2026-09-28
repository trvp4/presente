# Ligar o Google Forms do Espaços de Leitura à Central

Feito **uma vez**, por quem é dona do formulário, no computador, logada na conta Google do formulário. Leva uns 10 minutos.

Depois disso, cada resposta que uma escola enviar aparece sozinha na Central. As escolas continuam usando o mesmo formulário de sempre, sem mudar nada para elas.

## Antes de começar

- Peça a quem cuida da Central o **segredo do formulário**, um código comprido gerado pelo assistente (`npm run assistente -- formulario`). Ele deve chegar por conversa privada.
- Tenha em mãos o arquivo **`EnviarParaCentral.gs`**, que fica nesta mesma pasta.

## 1. Abrir o editor de scripts do formulário

1. Abra o **Google Forms do Espaços de Leitura** no modo de edição.
2. Clique nos **três pontinhos (⋮)** no canto superior direito → **Apps Script**.
3. Abre uma aba nova com um arquivo chamado **Código.gs**.

## 2. Colar o script

1. No **Código.gs**, apague tudo o que estiver escrito.
2. Cole todo o conteúdo do arquivo **`EnviarParaCentral.gs`**.
3. Clique no disquete (**Salvar projeto**) ou aperte **Ctrl+S**.
4. Se o Google pedir um nome para o projeto, escreva **Central**.

## 3. Guardar o segredo

1. Na barra da esquerda, clique na **engrenagem (Configurações do projeto)**.
2. Role até **Propriedades do script** → **Adicionar propriedade do script**.
3. Em **Propriedade**, escreva exatamente: `SEGREDO_CENTRAL`
4. Em **Valor**, cole o segredo que você recebeu.
5. Clique em **Salvar propriedades do script**.

## 4. Ligar o envio automático

1. Volte para o editor (ícone **< >** na barra da esquerda).
2. No alto, ao lado de **Executar**, escolha a função **`instalar`** e clique em **Executar**.
3. O Google pede autorização: **Revisar permissões** → escolha a sua conta.
4. Vai aparecer um aviso de que *"o Google não verificou este app"*. É normal, porque o script é seu e não uma empresa externa. Clique em **Avançado** → **Acessar Central (não seguro)** → **Permitir**.
5. Embaixo, no **Registro de execução**, deve aparecer: *"Pronto: cada nova resposta será enviada para a Central."*

## 5. Mandar as respostas que já existem

1. No mesmo lugar, escolha a função **`enviarTodasAsRespostas`** e clique em **Executar**.
2. No registro deve aparecer algo como *"33 de 33 respostas enviadas."*

Pode rodar de novo quando quiser: a Central **não duplica** respostas.

## Se algo der errado

- **"Falta configurar o SEGREDO_CENTRAL"**: refaça o passo 3, com o nome escrito exatamente `SEGREDO_CENTRAL`.
- **"a Central respondeu 401"**: o segredo está errado. Peça o segredo de novo e cole no passo 3.
- **"a Central respondeu 422 … perguntas do formulário não encontradas"**: alguma pergunta essencial (projeto, instituição, mês) foi renomeada no formulário. Avise quem cuida da Central antes de mudar as perguntas.
- **O Google mandou um e-mail de "falha" no envio de alguma resposta** (por exemplo, a Central estava fora do ar): quando voltar, rode **`enviarTodasAsRespostas`**. As que faltaram entram e as outras não duplicam.

---

# Avaliação da formação (formulário "Avaliação - Formação de Professores")

São os **mesmos passos**, com o **mesmo segredo**. Só muda o formulário e o arquivo colado:

1. Abra o formulário **Avaliação - Formação de Professores** → **⋮** → **Apps Script**.
2. Cole o conteúdo de **`AvaliacaoParaCentral.gs`** (em vez do `EnviarParaCentral.gs`).
3. Faça os passos 3, 4 e 5 acima (segredo, `instalar`, `enviarTodasAsRespostas`).

Os resultados aparecem no Presente, em **Avaliações** (ícone de gráfico no menu). O e-mail de quem respondeu não é guardado.
