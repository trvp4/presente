'use client'
// Ações do plano de capacitações: acrescentar, corrigir, ligar a uma lista.
import { useId, useState } from 'react'
import { useAcao } from '@/components/client'
import CityPicker from '@/components/CityPicker'
import { excluirItem, ligarLista, salvarItem, type DadosItem } from './actions'

type Opcao = { id: string; rotulo: string }
export type Opcoes = { projetos: Opcao[]; escolas: Opcao[]; listasLivres: Opcao[] }

function Campos({ d, set, op }: { d: DadosItem; set: (k: keyof DadosItem, v: string) => void; op: Opcoes }) {
  const u = useId()
  const campo = (k: keyof DadosItem) => ({ id: u + k, value: d[k], onChange: (e: { target: { value: string } }) => set(k, e.target.value) })
  return (
    <>
      <div className="f"><label htmlFor={u + 'project_id'}>Projeto</label><select required {...campo('project_id')}><option value="">escolha…</option>{op.projetos.map(p => <option key={p.id} value={p.id}>{p.rotulo}</option>)}</select></div>
      <div className="f"><label htmlFor={u + 'tipo'}>Tipo</label><input required maxLength={200} {...campo('tipo')} /></div>
      <div className="f"><label htmlFor={u + 'patrocinador'}>Patrocinador</label><input maxLength={120} {...campo('patrocinador')} /></div>
      <div className="f"><label htmlFor={u + 'school_id'}>Escola</label><select {...campo('school_id')}><option value="">a definir</option>{op.escolas.map(e => <option key={e.id} value={e.id}>{e.rotulo}</option>)}</select></div>
      <div className="f"><label htmlFor={u + 'cidade'}>Cidade</label><CityPicker id={u + 'cidade'} name="cidade" value={d.cidade} onChange={v => set('cidade', v)} /></div>
      <div className="f curto"><label htmlFor={u + 'data_prevista'}>Data</label><input type="date" {...campo('data_prevista')} /></div>
      <div className="f curto"><label htmlFor={u + 'hora'}>Hora</label><input type="time" {...campo('hora')} /></div>
      <div className="f curto"><label htmlFor={u + 'situacao'}>Situação</label><select {...campo('situacao')}><option value="planejada">Planejada</option><option value="realizada">Realizada</option><option value="cancelada">Cancelada</option></select></div>
    </>
  )
}

const VAZIO: DadosItem = { project_id: '', school_id: '', patrocinador: '', tipo: 'Formação Espaço de Leitura', cidade: '', data_prevista: '', hora: '', situacao: 'planejada', observacoes: '' }

export function NovoItem({ op }: { op: Opcoes }) {
  const [aberto, setAberto] = useState(false)
  const [d, setD] = useState(VAZIO)
  const [pendente, rodar] = useAcao()
  if (!aberto) return <button className="btn btn-dark btn-sm" onClick={() => setAberto(true)}>Adicionar ao plano</button>
  return (
    <form className="card es-form" style={{ flexBasis: '100%' }} onSubmit={e => { e.preventDefault(); rodar(() => salvarItem(null, d), 'Capacitação acrescentada ao plano.', () => { setD(VAZIO); setAberto(false) }) }}>
      <Campos d={d} set={(k, v) => setD({ ...d, [k]: v })} op={op} />
      <button className="btn btn-dark btn-sm" disabled={pendente}>Salvar</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAberto(false)}>Cancelar</button>
    </form>
  )
}

export function EditarItem({ id, inicial, op, sugestao }: { id: string; inicial: DadosItem; op: Opcoes; sugestao?: { id: string; rotulo: string } }) {
  const [aberto, setAberto] = useState(false)
  const [d, setD] = useState(inicial)
  const [lista, setLista] = useState('')
  const [pendente, rodar] = useAcao()
  return (
    <>
      <div className="acts">
        {sugestao && <button className="btn btn-dark btn-sm" disabled={pendente} onClick={() => rodar(() => ligarLista(id, sugestao.id), 'Lista ligada ao plano.')}>Ligar à lista de {sugestao.rotulo}</button>}
        <button className="btn btn-ghost btn-sm" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>Editar</button>
      </div>
      {aberto && (
        <form className="es-inline" onSubmit={e => { e.preventDefault(); rodar(() => salvarItem(id, d), 'Plano atualizado.', () => setAberto(false)) }}>
          <Campos d={d} set={(k, v) => setD({ ...d, [k]: v })} op={op} />
          <button className="btn btn-dark btn-sm" disabled={pendente}>Salvar</button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={pendente}
            onClick={() => confirm('Excluir este item do plano? A lista de presença, se houver, continua existindo.') && rodar(() => excluirItem(id), 'Item excluído do plano.')}>Excluir</button>
          {op.listasLivres.length > 0 && (
            <div className="es-form" style={{ flexBasis: '100%' }}>
              <div className="f"><label htmlFor={id + '-lista'}>Ou ligar a uma lista que já existe</label><select id={id + '-lista'} value={lista} onChange={e => setLista(e.target.value)}><option value="">escolha a lista…</option>{op.listasLivres.map(l => <option key={l.id} value={l.id}>{l.rotulo}</option>)}</select></div>
              <button type="button" className="btn btn-ghost btn-sm" disabled={!lista || pendente} onClick={() => rodar(() => ligarLista(id, lista), 'Lista ligada ao plano.')}>Ligar</button>
            </div>
          )}
        </form>
      )}
    </>
  )
}

export function Desligar({ id }: { id: string }) {
  const [pendente, rodar] = useAcao()
  return <button className="btn btn-ghost btn-sm" disabled={pendente} onClick={() => confirm('Desligar esta lista do item do plano? A lista continua existindo.') && rodar(() => ligarLista(id, null), 'Lista desligada do plano.')}>Desligar</button>
}
