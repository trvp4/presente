import { getStaff } from '@/lib/supabase/server'
import { carregarEspacos } from '@/lib/espacos/banco'
import { ehMesIso, rotuloMes } from '@/lib/espacos/normalizacao'
import { fmtCnpj, todayISO } from '@/lib/format'
import { Cabecalho } from '../ui'
import { AtivarAcompanhamento, EncerrarAcompanhamento, NovoVinculo } from '../Acoes'

export const metadata = { title: 'Escolas · Espaços de Leitura' }

export default async function Escolas() {
  const { supabase } = await getStaff()
  const es = await carregarEspacos(supabase)
  const mes = todayISO().slice(0, 7)
  const respostasPor = new Map<string, number>()
  for (const r of es.respostas) if (r.vigente && r.situacao === 'válida') respostasPor.set(r.vinculo_id, (respostasPor.get(r.vinculo_id) ?? 0) + 1)

  const linhas = es.estado.vinculos
    .map(v => {
      const e = es.cadastro.escolaPorId[v.escola_id] ?? {}
      const d = es.descrever(v.vinculo_id)
      const encerrado = ehMesIso(v.fim) && v.fim < mes
      return { v, e, d, encerrado, ativo: v.acompanhar === true && !encerrado && e.situacao !== 'inativa' }
    })
    .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.d.escola.localeCompare(b.d.escola))
  const ativos = linhas.filter(l => l.ativo)

  return (
    <section className="view">
      <Cabecalho titulo="Escolas" texto={`${ativos.length} escola${ativos.length === 1 ? '' : 's'} em acompanhamento, em ${new Set(ativos.map(l => l.d.projeto)).size} projeto(s). Uma escola em dois projetos responde duas vezes.`}>
        <NovoVinculo
          escolas={es.schools.map(s => ({ id: s.id, rotulo: s.cidade ? `${s.nome} · ${s.cidade}` : s.nome }))}
          projetos={es.projects.filter(p => !p.archived).map(p => ({ id: p.id, rotulo: p.name }))}
        />
      </Cabecalho>

      {linhas.length ? (
        <div className="es-tbl">
          <table>
            <thead><tr><th>Escola</th><th>Projeto</th><th>Patrocinador</th><th>Acompanhamento</th><th style={{ textAlign: 'right' }}>Respostas</th><th /></tr></thead>
            <tbody>
              {linhas.map(({ v, e, d, encerrado, ativo }) => (
                <tr key={v.vinculo_id} style={ativo ? undefined : { color: 'var(--muted)' }}>
                  <td>
                    <b>{d.escola}</b>
                    <div className="sub">{[d.cidade, e.cnpj ? `CNPJ ${fmtCnpj(e.cnpj)}` : 'sem CNPJ'].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td>{d.projeto}</td>
                  <td>{d.patrocinador || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {v.acompanhar !== true ? 'a confirmar (sem cobrança)' : `${ehMesIso(v.inicio) ? rotuloMes(v.inicio) : 'sempre'}${ehMesIso(v.fim) ? ` a ${rotuloMes(v.fim)}` : ' em diante'}`}
                  </td>
                  <td className="n">{respostasPor.get(v.vinculo_id) ?? 0}</td>
                  <td style={{ textAlign: 'right' }}>{v.acompanhar === true ? <EncerrarAcompanhamento vinculo={v.vinculo_id} encerrado={encerrado} /> : <AtivarAcompanhamento vinculo={v.vinculo_id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty"><span className="hand wipe">Nenhuma escola ainda…</span><br />Adicione a primeira acima, ou aguarde a carga das planilhas antigas.</div>
      )}
      <p className="hint">O CNPJ liga a escola às listas de presença do Presente. Sem ele a escola funciona normalmente aqui; ele entra quando a escola aparece numa lista.</p>
    </section>
  )
}
