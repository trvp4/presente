# Presente

Registro digital de presença nas capacitações de voluntários dos projetos culturais realizados pelo Instituto Cuidare. Substitui a lista em papel (imprimir, assinar, escanear) e entrega a lista pronta para a prestação de contas do projeto.

## Language

### Projeto e realização

**Projeto**:
Iniciativa cultural incentivada, identificada por um Pronac, em nome da qual as capacitações acontecem.
_Avoid_: Programa, ação

**Pronac**:
Número que identifica o Projeto no Ministério da Cultura (Lei Rouanet).
_Avoid_: Código do projeto

**Realizadora**:
Organização responsável por executar os Projetos e por guardar os dados das Presenças; é sempre o Instituto Cuidare.
_Avoid_: Proponente, empresa

**Instituição Beneficiada**:
Organização (em geral uma escola) que recebe o Projeto em uma Capacitação específica, identificada por nome, CNPJ e cidade.
_Avoid_: Escola (é só um exemplo), cliente, parceiro

### Capacitação e presença

**Capacitação**:
Encontro de formação de voluntários de um Projeto, em uma Instituição Beneficiada, com data, horário e Instrutor.
_Avoid_: Reunião, treinamento, evento, turma

**Lista de Presença**:
O conjunto das Presenças de uma Capacitação; cada Capacitação tem exatamente uma.
_Avoid_: Lista (sozinho, quando houver ambiguidade), folha de presença

**Voluntário**:
Pessoa que participa da Capacitação e registra a própria Presença.
_Avoid_: Participante, aluno, usuário

**Presença**:
O registro de que um Voluntário esteve em uma Capacitação: nome, Cargo, CPF, Assinatura e horário.
_Avoid_: Check-in, inscrição, assinatura (é só uma parte da Presença)

**Assinatura**:
O traço feito à mão pelo Voluntário na tela, que acompanha a Presença.
_Avoid_: Rubrica, autógrafo

**Cargo**:
A função do Voluntário no Projeto (ex.: Monitor, Arte-educador).
_Avoid_: Profissão, função na empresa

**Consentimento**:
A concordância explícita do Voluntário com o uso dos seus dados apenas para a prestação de contas, dada no momento da Presença.
_Avoid_: Aceite, termo

**Participantes previstos**:
Quantos Voluntários a Equipe espera na Capacitação; serve de referência de progresso e limita quantas Presenças a Lista aceita.
_Avoid_: Vagas, capacidade

### Janela e ciclo da lista

**Link de Presença**:
O endereço (e o QR code equivalente) pelo qual os Voluntários registram Presença em uma Capacitação.
_Avoid_: Formulário, URL de inscrição

**Janela de Assinatura**:
O período em que a Lista de Presença aceita Presenças: de 30 minutos antes do início até 1 hora depois do término da Capacitação.
_Avoid_: Horário do link, validade

**Abertura / Encerramento manual**:
Quando a Equipe abre ou encerra a Lista de Presença fora da Janela de Assinatura, sobrepondo o horário.
_Avoid_: Ativar/desativar link

**Lista enviada**:
Estado da Lista de Presença cujo documento oficial já foi entregue para a prestação de contas.
_Avoid_: PDF enviado, lista finalizada

**Documento da Lista**:
A Lista de Presença no modelo oficial em Word do Instituto Cuidare, com logo do Projeto, dados da Capacitação e as Presenças com Assinaturas.
_Avoid_: PDF, relatório, planilha (a planilha é só uma exportação auxiliar)

### Equipe

**Equipe**:
As pessoas do Instituto Cuidare autorizadas a criar Capacitações e acompanhar as Listas de Presença.
_Avoid_: Staff, admin, usuários

**Instrutor**:
Quem conduz a Capacitação; pode ou não ser alguém da Equipe.
_Avoid_: Professor, palestrante, facilitador

**Prestação de contas**:
A comprovação, ao órgão de fomento, de que as atividades do Projeto aconteceram; é o destino final do Documento da Lista.
_Avoid_: Relatório, auditoria

### Espaços de Leitura (módulo da Central)

**Central**:
O sistema da Equipe com dois módulos separados na tela e conectados nos dados: Presente (listas de presença) e Espaços de Leitura (acompanhamento mensal das escolas).
_Avoid_: Hub, portal, app

**Espaço de Leitura**:
A biblioteca/cantinho montado por um Projeto dentro de uma Instituição Beneficiada, acompanhado todo mês.
_Avoid_: Biblioteca (sozinho), canto

**Vínculo**:
A ligação de uma Instituição Beneficiada com um Projeto; é a unidade que responde todo mês (uma escola em dois Projetos responde duas vezes).
_Avoid_: Contrato, participação

**Patrocinador**:
A empresa que financia o Projeto numa escola; agrupa Vínculos no relatório, mesmo quando escrita de formas diferentes.
_Avoid_: Cliente, parceiro, apoiador

**Ciclo**:
Um mês de acompanhamento (AAAA-MM), aberto e depois encerrado pela Equipe.
_Avoid_: Período, rodada

**Obrigação**:
O dever de um Vínculo responder num Ciclo; fica pendente, respondida, em revisão, dispensada ou fora do ciclo.
_Avoid_: Tarefa, cobrança

**Resposta mensal**:
O que a escola envia pelo Google Forms sobre um mês; o mês de referência vem da resposta, nunca da data de envio.
_Avoid_: Relatório da escola, formulário (é o meio, não a coisa)

**Resposta vigente**:
A última Resposta mensal de um Vínculo para um mês; as anteriores ficam "substituídas" e guardadas, e só a vigente entra nas somas.
_Avoid_: Resposta final, versão

**Revisão**:
Quando a Equipe confere uma Resposta mensal que o sistema não conseguiu entender sozinho (escola desconhecida, número ilegível, mês ambíguo).
_Avoid_: Validação, auditoria

**Dispensa**:
Decisão da Equipe, com motivo, de não cobrar uma Obrigação (ex.: espaço em reforma).
_Avoid_: Isenção, exceção

**Fechamento**:
O resultado guardado de um Ciclo encerrado; se algo mudar depois, vira uma nova versão e a anterior fica.
_Avoid_: Snapshot, consolidado
