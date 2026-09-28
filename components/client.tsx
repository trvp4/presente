'use client'
// Peças interativas pequenas: toast, copiar link, QR code "imprimindo", logo.
import { useEffect, useRef, useState, useTransition } from 'react'
import QRCode from 'qrcode'
import { SignatureMark } from './ui'

export function toast(message: string) {
  let el = document.getElementById('toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'toast'
    el.className = 'toast'
    el.setAttribute('role', 'status')
    el.setAttribute('aria-live', 'polite')
    document.body.appendChild(el)
  }
  el.textContent = message
  el.classList.add('on')
  const w = window as unknown as { __toastT?: number }
  clearTimeout(w.__toastT)
  w.__toastT = window.setTimeout(() => el!.classList.remove('on'), 2600)
}

// Copia usando a API do navegador e, se ela falhar, o método antigo (textarea + execCommand).
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try { ok = document.execCommand('copy') } catch {}
    ta.remove()
    return ok
  }
}

// Botão "Copiar" que vira "Copiado" com um check escrito à mão.
export function CopyButton({ text, className = 'btn btn-dark btn-sm', label = 'Copiar link' }: { text: string; className?: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle')
  const timer = useRef<number>(undefined)
  const click = async () => {
    const ok = await copyText(text)
    setState(ok ? 'ok' : 'fail')
    toast(ok ? 'Link copiado — é só colar no WhatsApp' : 'Não consegui copiar. Selecione o link e copie manualmente.')
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 2200)
  }
  return (
    <button type="button" className={`${className} copy-btn ${state === 'ok' ? 'copied' : ''}`} onClick={click} aria-live="polite">
      {state === 'ok' ? (
        <>
          <svg className="write" style={{ ['--dur' as string]: '.35s' }} width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path pathLength={1} d="M2 6.5l2.6 2.6L10 3" />
          </svg>
          Copiado
        </>
      ) : label}
    </button>
  )
}

// QR code real (biblioteca qrcode) desenhado linha a linha, como uma impressora.
export function QrCanvas({ text, animate = true, label = 'QR code do link de presença' }: { text: string; animate?: boolean; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
    const N = qr.modules.size, s = 6, q = 2 // q = margem em módulos
    const W = (N + q * 2) * s
    cv.width = cv.height = W
    const ctx = cv.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, W, W)
    const row = (y: number) => {
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, (y + q) * s, W, s)
      ctx.fillStyle = '#000'
      for (let x = 0; x < N; x++) if (qr.modules.get(y, x)) ctx.fillRect((x + q) * s, (y + q) * s, s, s)
    }
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!animate || reduce) {
      for (let y = 0; y < N; y++) row(y)
      return
    }
    let done = 0, raf = 0
    const t0 = performance.now(), dur = 1100
    const f = (now: number) => {
      const upto = Math.min(N, Math.floor(((now - t0) / dur) * N))
      for (; done < upto; done++) row(done)
      if (done < N) {
        ctx.fillStyle = '#FFC4D6'
        ctx.fillRect(q * s, (done + q) * s, N * s, s * 1.5)
        raf = requestAnimationFrame(f)
      }
    }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [text, animate])
  return <canvas ref={ref} role="img" aria-label={label} />
}

export function Logo() {
  const ref = useRef<HTMLDivElement>(null)
  // reescreve a assinatura ao passar o mouse
  const replay = () => {
    const sv = ref.current?.querySelector('svg')
    if (!sv) return
    sv.classList.remove('write')
    void sv.getBoundingClientRect()
    sv.style.setProperty('--d', '0s')
    sv.classList.add('write')
  }
  return (
    <div className="logo" role="img" aria-label="Presente" ref={ref} onMouseEnter={replay}>
      <SignatureMark />
    </div>
  )
}

// número que sobe com um "pulo" quando muda
export function useCountUp(value: number, ref: React.RefObject<HTMLElement | null>) {
  const [shown, setShown] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    const from = prev.current
    prev.current = value
    if (from === value) return
    const el = ref.current
    if (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump') }
    const t0 = performance.now(), d = 650
    let raf = 0
    const f = (now: number) => {
      const k = Math.min(1, (now - t0) / d)
      setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(f)
    }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [value, ref])
  return shown
}

// Reduz a imagem do logo (máx. 800 px de largura) e devolve como data URL, leve para o banco.
export function fileToLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Escolha um arquivo de imagem (PNG ou JPG).'))
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, 800 / img.width)
      const cv = document.createElement('canvas')
      cv.width = Math.round(img.width * scale)
      cv.height = Math.round(img.height * scale)
      cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height)
      URL.revokeObjectURL(url)
      let out = cv.toDataURL('image/png')
      if (out.length > 550_000) {
        // o Word não aceita WebP: usa JPEG com fundo branco
        const j = document.createElement('canvas')
        j.width = cv.width; j.height = cv.height
        const c = j.getContext('2d')!
        c.fillStyle = '#fff'; c.fillRect(0, 0, j.width, j.height); c.drawImage(cv, 0, 0)
        out = j.toDataURL('image/jpeg', 0.9)
      }
      if (out.length > 550_000) return reject(new Error('Imagem muito grande. Tente uma versão menor do logo.'))
      resolve(out)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível abrir essa imagem.')) }
    img.src = url
  })
}

// Roda uma ação do servidor ({ error? }) e mostra o resultado num toast.
export function useAcao() {
  const [pendente, start] = useTransition()
  const rodar = (fn: () => Promise<{ error?: string }>, ok: string, depois?: () => void) =>
    start(async () => {
      const r = await fn()
      if (r.error) return toast(r.error)
      toast(ok)
      depois?.()
    })
  return [pendente, rodar] as const
}
