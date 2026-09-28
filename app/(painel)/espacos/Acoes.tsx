'use client'
// Ações interativas do Espaços de Leitura. Cada uma chama uma ação do servidor (./actions) e mostra o resultado num toast.
import { useState } from 'react'
import { toast, useAcao } from '@/components/client'
import CityPicker from '@/components/CityPicker'
import * as A from './actions'

// ---------------- mês ----------------
export function NovoCiclo({ sugestao }: { sugestao: string }) {
  const [aberto, setAberto] = useState(false)
  const [mes, setMes] = useState(sugestao)
  const [prazo, setPrazo] = useState('')
  const [pendente, rodar] = useAcao()
  if (!aberto) return <button className="btn btn-dark btn-sm" onClick={() => setAberto(true)}>Abrir mês</button>
  return (
    <form className="es-inline" onSubmit={e => { e.preventDefault(); rodar(() => A.abrirCiclo(mes, prazo), 'Mês aberto: as escolas em acompanhamento passam a ser esperadas.', () => setAberto(false)) }}>
      <div className="f curto"><label htmlFor="c-mes">Mês</label><input id="c-mes" type="month" value={mes} onChange={e => setMes(e.target.value)} required /></div>
      <div className="f curto"><label htmlFor="c-prazo">Prazo (opcional)</label><input id="c-prazo" type="date" value={prazo} onChange={e => setPrazo(e.target.value)} /></div>
      <button className="btn btn-dark btn-sm" disabled={pendente}>Abrir</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAberto(false)}>Cancelar</button>
    </form>
  )
}

export function EncerrarCiclo({ id, encerrado }: { id: string; encerrado: boolean }) {
  const [pendente, rodar] = useAcao()
  const clicar = () => {
    if (!encerrado && !confirm('Encerrar o mês? O resultado fica guardado como uma versão. Se algo mudar depois, uma nova versão é registrada.')) return
    rodar(() => A.encerrarCiclo(id, !encerrado), encerrado ? 'Mês reaberto.' : 'Mês encerrado e resultado guardado.')
  }
  return <button className="btn btn-ghost btn-sm" onClick={clicar} disabled={pendente}>{encerrado ? 'Reabrir mês' : 'Encerrar mês'}</button>
}

const CANAIS = ['WhatsApp', 'Telefone', 'E-mail', 'Visita', 'Outro']

export function AcoesObrigacao({ ciclo, vinculo, dispensada }: { ciclo: string; vinculo: string; dispensada: boolean }) {
  const [modo, setModo] = useState<'' | 'contato' | 'dispensa'>('')
  const [canal, setCanal] = useState('WhatsApp')
  const [texto, setTexto] = useState('')
  const [pendente, rodar] = useAcao()
  const fechar = () => { setModo(''); setTexto('') }
  if (dispensada)
    return <div className="acts"><button className="btn btn-ghost btn-sm" disabled={pendente} onClick={() => rodar(() => A.desfazerDispensa(ciclo, vinculo), 'Dispensa desfeita.')}>Desfazer dispensa</button></div>
  return (
    <>
      <div className="acts">
        <button className="btn btn-ghost btn-sm" onClick={() => setModo(modo === 'contato' ? '' : 'contato')} aria-expanded={modo === 'contato'}>Registrar contato</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setModo(modo === 'dispensa' ? '' : 'dispensa')} aria-expanded={modo === 'dispensa'}>Dispensar</button>
      </div>
      {modo === 'contato' && (
        <form className="es-inline" onSubmit={e => { e.preventDefault(); rodar(() => A.registrarContato(ciclo, vinculo, canal, texto), 'Contato registrado.', fechar) }}>
          <div className="f curto"><label htmlFor={`cn-${vinculo}`}>Canal</label>
            <select id={`cn-${vinculo}`} value={canal} onChange={e => setCanal(e.target.value)}>{CANAIS.map(c => <option key={c}>{c}</option>)}</select></div>
          <div className="f"><label htmlFor={`rs-${vinculo}`}>O que ficou combinado</label><input id={`rs-${vinculo}`} value={texto} onChange={e => setTexto(e.target.value)} maxLength={500} placeholder="ex.: vai responder até sexta" /></div>
          <button className="btn btn-dark btn-sm" disabled={pendente}>Salvar</button>
        </form>
      )}
      {modo === 'dispensa' && (
        <form className="es-inline" onSubmit={e => { e.preventDefault(); rodar(() => A.dispensar(ciclo, vinculo, texto), 'Escola dispensada neste mês.', fechar) }}>
          <div className="f"><label htmlFor={`ds-${vinculo}`}>Motivo da dispensa</label><input id={`ds-${vinculo}`} value={texto} onChange={e => setTexto(e.target.value)} maxLength={500} required placeholder="ex.: escola em recesso" /></div>
          <button className="btn btn-dark btn-sm" disabled={pendente}>Dispensar</button>
        </form>
      )}
    </>
  )
}

// ---------------- revisão ----------------
type Opcao = { id: string; rotulo: string }

export function Revisar({ id, precisaVinculo, precisaMes, naoLidos, vinculos }: {
  id: string; precisaVinculo: boolean; precisaMes: boolean
  naoLidos: { visitas: boolean; emprestimos: boolean; eventos: boolean }; vinculos: Opcao[]
}) {
  const [d, setD] = useState<A.Revisao>({ vinculo_manual: '', mes_manual: '', visitas: '', emprestimos: '', eventos: '', decisao: '', nota: '', guardar_apelido: true })
  const [pendente, rodar] = useAcao()
  const campo = (k: keyof A.Revisao) => ({ value: d[k] as string, onChange: (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value }) })
  const enviar = (decisao: A.Revisao['decisao']) => {
    if (decisao === 'aceitar' && precisaVinculo && !d.vinculo_manual) return toast('Escolha a escola antes de aceitar.')
    if (decisao === 'aceitar' && precisaMes && !d.mes_manual) return toast('Informe o mês antes de aceitar.')
    rodar(() => A.revisar(id, { ...d, decisao }), decisao === 'descartar' ? 'Resposta descartada.' : 'Revisão salva.')
  }
  const numero = (k: 'visitas' | 'emprestimos' | 'eventos', rotulo: string) => (
    <div className="f curto"><label htmlFor={`${k}-${id}`}>{rotulo}</label><input id={`${k}-${id}`} inputMode="numeric" {...campo(k)} /></div>
  )
  return (
    <div className="es-form">
      {precisaVinculo && (
        <div className="f"><label htmlFor={`v-${id}`}>É a escola</label>
          <select id={`v-${id}`} {...campo('vinculo_manual')}>
            <option value="">escolha…</option>
            {vinculos.map(v => <option key={v.id} value={v.id}>{v.rotulo}</option>)}
          </select></div>
      )}
      {precisaMes && <div className="f curto"><label htmlFor={`m-${id}`}>Mês de referência</label><input id={`m-${id}`} type="month" {...campo('mes_manual')} /></div>}
      {naoLidos.visitas && numero('visitas', 'Visitas no mês')}
      {naoLidos.emprestimos && numero('emprestimos', 'Empréstimos no mês')}
      {naoLidos.eventos && numero('eventos', 'Eventos no mês')}
      <div className="f"><label htmlFor={`n-${id}`}>Nota (opcional)</label><input id={`n-${id}`} maxLength={500} {...campo('nota')} /></div>
      {precisaVinculo && (
        <label className="hint" style={{ display: 'flex', gap: 6, alignItems: 'center', flexBasis: '100%' }}>
          <input type="checkbox" checked={d.guardar_apelido} onChange={e => setD({ ...d, guardar_apelido: e.target.checked })} />
          Reconhecer este nome sozinho nas próximas respostas
        </label>
      )}
      <button className="btn btn-dark btn-sm" disabled={pendente} onClick={() => enviar('aceitar')}>Confirmar</button>
      <button className="btn btn-ghost btn-sm" disabled={pendente} onClick={() => enviar('descartar')}>Descartar</button>
    </div>
  )
}

// ---------------- escolas ----------------
export function NovoVinculo({ escolas, projetos }: { escolas: Opcao[]; projetos: Opcao[] }) {
  const vazio: A.NovoVinculo = { school_id: '', nome: '', cidade: '', cnpj: '', project_id: '', patrocinador: '', inicio: '', fim: '' }
  const [aberto, setAberto] = useState(false)
  const [d, setD] = useState(vazio)
  const [pendente, rodar] = useAcao()
  const campo = (k: keyof A.NovoVinculo) => ({ value: d[k], onChange: (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value }) })
  if (!aberto) return <button className="btn btn-dark btn-sm" onClick={() => setAberto(true)}>Adicionar escola</button>
  return (
    <form className="card es-form" onSubmit={e => { e.preventDefault(); rodar(() => A.adicionarVinculo(d), 'Escola em acompanhamento.', () => { setD(vazio); setAberto(false) }) }}>
      <div className="f"><label htmlFor="nv-escola">Escola</label>
        <select id="nv-escola" {...campo('school_id')}>
          <option value="">Nova escola…</option>
          {escolas.map(e => <option key={e.id} value={e.id}>{e.rotulo}</option>)}
        </select></div>
      {!d.school_id && (
        <>
          <div className="f"><label htmlFor="nv-nome">Nome da escola</label><input id="nv-nome" maxLength={200} required {...campo('nome')} /></div>
          <div className="f"><label htmlFor="nv-cidade">Cidade</label><CityPicker id="nv-cidade" name="cidade" value={d.cidade} onChange={v => setD({ ...d, cidade: v })} /></div>
          <div className="f curto"><label htmlFor="nv-cnpj">CNPJ (se souber)</label><input id="nv-cnpj" inputMode="numeric" maxLength={18} {...campo('cnpj')} /></div>
        </>
      )}
      <div className="f"><label htmlFor="nv-proj">Projeto</label>
        <select id="nv-proj" required {...campo('project_id')}>
          <option value="">escolha…</option>
          {projetos.map(p => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
        </select></div>
      <div className="f"><label htmlFor="nv-pat">Patrocinador</label><input id="nv-pat" maxLength={120} placeholder="ex.: Fundação Aurora" {...campo('patrocinador')} /></div>
      <div className="f curto"><label htmlFor="nv-ini">Acompanhar desde</label><input id="nv-ini" type="month" {...campo('inicio')} /></div>
      <div className="f curto"><label htmlFor="nv-fim">Até (opcional)</label><input id="nv-fim" type="month" {...campo('fim')} /></div>
      <button className="btn btn-dark btn-sm" disabled={pendente}>Salvar</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAberto(false)}>Cancelar</button>
    </form>
  )
}

export function EncerrarAcompanhamento({ vinculo, encerrado }: { vinculo: string; encerrado: boolean }) {
  const [pendente, rodar] = useAcao()
  const clicar = () => {
    if (!encerrado && !confirm('Encerrar o acompanhamento desta escola? Ela deixa de ser cobrada a partir deste mês; o histórico fica.')) return
    rodar(() => A.encerrarAcompanhamento(vinculo, !encerrado), encerrado ? 'A escola volta a ser cobrada.' : 'Acompanhamento encerrado.')
  }
  return <button className="btn btn-ghost btn-sm" disabled={pendente} onClick={clicar}>{encerrado ? 'Retomar' : 'Encerrar'}</button>
}

export function AtivarAcompanhamento({ vinculo }: { vinculo: string }) {
  const [pendente, rodar] = useAcao()
  return <button className="btn btn-ghost btn-sm" disabled={pendente} onClick={() => rodar(() => A.ativarAcompanhamento(vinculo), 'A escola passa a ser cobrada todo mês.')}>Acompanhar</button>
}
