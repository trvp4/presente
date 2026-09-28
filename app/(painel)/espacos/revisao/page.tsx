import { getStaff } from '@/lib/supabase/server'
import { carregarEspacos } from '@/lib/espacos/banco'
import { rotuloMes } from '@/lib/espacos/normalizacao'
import { Cabecalho } from '../ui'
import { Revisar } from '../Acoes'

export const metadata = { title: 'Revisão · Espaços de Leitura' }

const TEXTOS = [['visitas_texto', 'Visitas'], ['emprestimos_texto', 'Empréstimos'], ['atividades_texto', 'Atividades']] as const

// Respostas que as regras não fecharam sozinhas. A Equipe confirma; nada muda sozinho.
export default async function Revisao() {
  const { supabase } = await getStaff()
  const es = await carregarEspacos(supabase)
  const fila = [...es.revisao].sort((a, b) => (b.carimbo instanceof Date ? +b.carimbo : 0) - (a.carimbo instanceof Date ? +a.carimbo : 0))
  const vinculos = Object.keys(es.cadastro.vinculoPorId)
    .map(id => { const d = es.descrever(id); return { id, rotulo: `${d.escola} · ${d.projeto}` } })
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo))

  return (
    <section className="view">
      <Cabecalho titulo="Revisão" texto="Respostas que o sistema não conseguiu fechar sozinho: nome de escola não reconhecido, mês que não deu para ler ou número escrito por extenso. Você confirma; nada muda sozinho." />
      {fila.length ? (
        <div className="es-stack">
          {fila.map(r => {
            const d = r.vinculo_id ? es.descrever(r.vinculo_id) : null
            return (
              <article key={r.resposta_id} className="es-rcard">
                <div className="row-acts" style={{ justifyContent: 'space-between', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <h3>{d?.escola ?? String(r.escola_informada || '(escola em branco)')}</h3>
                    <span className="hint">
                      {d?.projeto ?? String(r.projeto_informado)} · {r.mes ? rotuloMes(r.mes) : 'mês não reconhecido'}
                      {r.carimbo instanceof Date && ` · enviada em ${r.carimbo.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`}
                    </span>
                  </div>
                  <span className="st st-warn">Em revisão</span>
                </div>
                <div className="es-why">{r.motivos}</div>
                {!d && r.escola_informada && <div className="es-quote"><span className="lbl">Escola, como veio no formulário</span>{r.escola_informada} · {r.projeto_informado}</div>}
                {TEXTOS.map(([campo, rotulo]) => r[campo] && (
                  <div key={campo} className="es-quote"><span className="lbl">{rotulo}, como a escola escreveu</span>{String(r[campo])}</div>
                ))}
                <Revisar
                  id={r.resposta_id}
                  precisaVinculo={!r.vinculo_id}
                  precisaMes={!r.mes}
                  naoLidos={{ visitas: r.visitas_estado === 'não lido', emprestimos: r.emprestimos_estado === 'não lido', eventos: r.eventos_estado === 'não lido' }}
                  vinculos={vinculos}
                />
              </article>
            )
          })}
        </div>
      ) : (
        <div className="empty"><span className="hand wipe">Tudo revisado!</span><br />Quando uma resposta do formulário precisar de você, ela aparece aqui.</div>
      )}
    </section>
  )
}
