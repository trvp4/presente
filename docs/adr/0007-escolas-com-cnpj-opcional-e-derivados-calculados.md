# Escolas num cadastro único com CNPJ opcional; derivados do acompanhamento são calculados

Com a Central, Presente e Espaços de Leitura passam a compartilhar um cadastro de escolas (`schools`). O Presente identifica a escola pelo CNPJ (ADR 0005), mas as escolas acompanhadas no Espaços de Leitura só têm nome. Por decisão da Equipe, o CNPJ é **opcional e único**: a escola ganha o CNPJ quando aparece numa lista do Presente, e até lá o acompanhamento a reconhece pelo nome normalizado (`chaveEscola`) e pelos apelidos. A alternativa, levantar os CNPJs das ~35 escolas antes, travaria o módulo nesse levantamento.

As tabelas `el_*` guardam só o que a escola enviou e o que a Equipe decidiu (revisão, dispensas, contatos, ciclos). Situação da resposta, vigência, obrigações, totais e taxa são **recalculados** por `processar()` (`lib/espacos/regras.ts`) a cada leitura, e não gravados, para nunca divergirem das regras. Na escala atual (dezenas de escolas, centenas de respostas) o custo é desprezível. Só o resultado de um ciclo encerrado é gravado (`el_fechamentos`), porque é o registro histórico que não pode mudar.

## Consequences

- Ao criar uma lista no Presente com o CNPJ de uma escola, a lista deve ser ligada a `schools` (criando a escola se ainda não existir) para cruzar com o acompanhamento.
- Se o volume crescer a ponto de recalcular tudo ficar lento, gravar os derivados numa tabela atualizada por `processar()`.
