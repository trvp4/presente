'use client'
import { useEffect, useRef, useState, useTransition } from 'react'
import { PRIVACY_CONTACT, REALIZACAO, maskCpf, onlyDigits } from '@/lib/format'
import { signAttendance, type SignResult } from './actions'

type Errors = Extract<SignResult, { ok: false }>['errors']
const ROLES = ['Monitor(a)', 'Arte-educador(a)', 'Produtor(a)', 'Apoio pedagógico', 'Voluntário(a) de apoio', 'Recepção']

const maskCpfInput = (v: string) =>
  onlyDigits(v).slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

type TurnstileApi = { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void }

// Verificação "não sou robô" da Cloudflare (quase sempre invisível). Só aparece se a chave estiver configurada.
function Turnstile({ onToken }: { onToken: (t: string) => void }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!SITE_KEY || !box.current) return
    const el = box.current
    const render = () => {
      const ts = (window as unknown as { turnstile?: TurnstileApi }).turnstile
      if (!ts || el.dataset.done) return
      el.dataset.done = '1'
      ts.render(el, { sitekey: SITE_KEY, language: 'pt-br', appearance: 'interaction-only', callback: onToken, 'expired-callback': () => onToken('') })
    }
    if ((window as unknown as { turnstile?: TurnstileApi }).turnstile) return render()
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.onload = render
    document.head.appendChild(s)
  }, [onToken])
  return SITE_KEY ? <div ref={box} /> : null
}

export default function SignForm({ code, title, pronac }: { code: string; title: string; pronac: string }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [cpf, setCpf] = useState('')
  const [consent, setConsent] = useState(false)
  const [signed, setSigned] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [done, setDone] = useState<{ time: string; name: string; cpf: string; sig: string } | null>(null)
  const [pending, start] = useTransition()
  const [captcha, setCaptcha] = useState('')
  const cvRef = useRef<HTMLCanvasElement>(null)

  // quadro de assinatura: traço mais fino quando rápido, mais grosso quando devagar
  useEffect(() => {
    const cv = cvRef.current
    if (!cv || done) return
    const r = cv.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    cv.width = r.width * dpr
    cv.height = r.height * dpr
    const ctx = cv.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = ctx.fillStyle = '#000'
    let drawing = false, lw = 2.6
    let last = { x: 0, y: 0, t: 0 }
    const pos = (e: PointerEvent) => {
      const b = cv.getBoundingClientRect()
      return { x: e.clientX - b.left, y: e.clientY - b.top }
    }
    const down = (e: PointerEvent) => {
      drawing = true
      cv.setPointerCapture(e.pointerId)
      const p = pos(e)
      last = { ...p, t: performance.now() }
      lw = 2.6
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.2, 0, 7); ctx.fill()
      setSigned(true)
    }
    const move = (e: PointerEvent) => {
      if (!drawing) return
      const p = pos(e), now = performance.now()
      const v = Math.hypot(p.x - last.x, p.y - last.y) / Math.max(1, now - last.t)
      lw = lw * 0.72 + Math.max(1, Math.min(3.8, 3.8 - v * 1.5)) * 0.28
      ctx.lineWidth = lw
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke()
      last = { ...p, t: now }
    }
    const up = () => { drawing = false }
    cv.addEventListener('pointerdown', down)
    cv.addEventListener('pointermove', move)
    cv.addEventListener('pointerup', up)
    cv.addEventListener('pointercancel', up)
    return () => {
      cv.removeEventListener('pointerdown', down)
      cv.removeEventListener('pointermove', move)
      cv.removeEventListener('pointerup', up)
      cv.removeEventListener('pointercancel', up)
    }
  }, [done])

  const clear = () => {
    const cv = cvRef.current
    if (!cv) return
    cv.getContext('2d')!.clearRect(0, 0, cv.width, cv.height)
    setSigned(false)
  }

  // exporta a assinatura em tamanho fixo (leve para o banco)
  const exportSignature = () => {
    const cv = cvRef.current!
    const out = document.createElement('canvas')
    out.width = 600
    out.height = Math.round((600 * cv.height) / cv.width)
    out.getContext('2d')!.drawImage(cv, 0, 0, out.width, out.height)
    return out.toDataURL('image/png')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const signature = signed ? exportSignature() : ''
    start(async () => {
      const res = await signAttendance({ code, name, role, cpf, signature, consent, captcha })
      if (!res.ok) {
        // o token anti-robô vale uma vez só: pede um novo para a próxima tentativa
        if (SITE_KEY) { setCaptcha(''); (window as unknown as { turnstile?: TurnstileApi }).turnstile?.reset() }
        return setErrors(res.errors)
      }
      setErrors({})
      setDone({ time: res.time, name: name.trim(), cpf: onlyDigits(cpf), sig: signature })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  if (done) {
    return (
      <div className="done-screen">
        <div className="signed"><img className="wipe" src={done.sig} alt="Sua assinatura" /><span /></div>
        <h2>Presença confirmada</h2>
        <p>Obrigado, {done.name.split(' ')[0]}! Sua assinatura já está na lista da capacitação.</p>
        <div className="receipt">
          <div><span>Capacitação</span><b style={{ textAlign: 'right' }}>{title}</b></div>
          <div><span>Pronac</span><b className="mono">{pronac}</b></div>
          <div><span>CPF</span><b className="mono">{maskCpf(done.cpf)}</b></div>
          <div><span>Horário</span><b className="mono">{done.time}</b></div>
        </div>
        <button className="btn btn-ghost" onClick={() => { setDone(null); setName(''); setRole(''); setCpf(''); setConsent(false); setSigned(false) }}>
          Registrar outra pessoa neste celular
        </button>
      </div>
    )
  }

  return (
    <form className="v-form" onSubmit={submit} noValidate>
      <div className={`f ${errors.name ? 'invalid' : ''}`}>
        <label htmlFor="vName">Nome completo</label>
        <input id="vName" autoComplete="name" placeholder="Como no documento" value={name} onChange={e => setName(e.target.value)} />
        <span className="err">{errors.name}</span>
      </div>
      <div className={`f ${errors.role ? 'invalid' : ''}`}>
        <label htmlFor="vRole">Cargo / função no projeto</label>
        <input id="vRole" list="roles" placeholder="Ex.: Monitor(a)" value={role} onChange={e => setRole(e.target.value)} />
        <datalist id="roles">{ROLES.map(r => <option key={r} value={r} />)}</datalist>
        <span className="err">{errors.role}</span>
      </div>
      <div className={`f ${errors.cpf ? 'invalid' : ''}`}>
        <label htmlFor="vCpf">CPF</label>
        <input id="vCpf" className="mono" inputMode="numeric" placeholder="000.000.000-00" maxLength={14} value={cpf} onChange={e => setCpf(maskCpfInput(e.target.value))} />
        <span className="err">{errors.cpf}</span>
      </div>
      <div className="f">
        <div className="sig-row"><label>Assinatura</label><button type="button" className="linkish" onClick={clear}>Limpar</button></div>
        <div className="sigpad">
          <div className="base" />
          {!signed && <div className="ph">Assine aqui com o dedo</div>}
          <canvas ref={cvRef} aria-label="Quadro de assinatura" />
        </div>
        <span className="err">{errors.signature}</span>
      </div>
      <details className="privacy">
        <summary>Como usamos seus dados</summary>
        <p>
          <b>Quem cuida dos dados:</b> {REALIZACAO}, responsável pela realização do projeto.<br />
          <b>Para quê:</b> comprovar sua presença nesta capacitação na prestação de contas do projeto cultural (Pronac).<br />
          <b>Quais dados:</b> nome, cargo, CPF, assinatura e horário do registro.<br />
          <b>Com quem:</b> equipe do projeto e órgãos responsáveis pela fiscalização e prestação de contas.<br />
          <b>Por quanto tempo:</b> pelo prazo exigido para a prestação de contas do projeto; depois disso, os dados são excluídos.<br />
          <b>Seus direitos:</b> você pode pedir acesso, correção ou exclusão dos seus dados{PRIVACY_CONTACT ? <> pelo e-mail <b>{PRIVACY_CONTACT}</b></> : <> com a equipe do {REALIZACAO} responsável pela capacitação</>}.
        </p>
      </details>
      <label className="consent">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
        <span>Confirmo minha participação e autorizo o uso destes dados apenas para a prestação de contas do projeto (LGPD).</span>
      </label>
      {errors.consent && <span className="err" style={{ fontSize: 12, color: 'var(--bad)' }}>{errors.consent}</span>}
      <Turnstile onToken={setCaptcha} />
      {errors.form && <div className="err-box" role="alert">{errors.form}</div>}
      <button className="btn btn-dark btn-lg" disabled={pending} style={{ width: '100%' }}>{pending ? 'Enviando…' : 'Confirmar presença'}</button>
    </form>
  )
}
