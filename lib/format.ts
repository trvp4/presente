// Formatação e regras compartilhadas entre servidor e navegador.

export type Project = {
  id: string
  name: string
  pronac: string | null // null: projeto só do Espaços de Leitura; lista de presença exige Pronac
  logo: string | null // imagem (data URL) que vai no topo da lista em Word
  archived: boolean
}

// Sempre a mesma em todas as listas (modelo oficial da empresa)
export const REALIZACAO = 'Instituto Cuidare'

// Contato para o voluntário exercer os direitos da LGPD (acesso, correção, exclusão).
// Preencha com o e-mail oficial (ex.: 'privacidade@institutocuidare.org.br').
export const PRIVACY_CONTACT = 'pedro@institutocuidare.ong.br'

export type Training = {
  id: string
  project_id: string
  title: string
  date: string // AAAA-MM-DD
  start_time: string // HH:MM:SS
  end_time: string
  instructor: string | null
  beneficiary_name: string | null // escola / instituição beneficiada
  beneficiary_cnpj: string | null // CNPJ da escola (só números)
  city: string | null
  expected_count: number
  keep_open_hours: number | null // lista estendida (JANELAS_ESTENDIDAS); null = só o horário do encontro
  code: string
  state: 'auto' | 'open' | 'closed'
  pdf_sent_at: string | null
  created_at: string
}

export type Attendance = {
  id: string
  training_id: string
  full_name: string
  role: string
  cpf: string
  signature: string
  created_at: string
}

export type Status = 'sched' | 'live' | 'done'

// O Brasil não tem horário de verão desde 2019: São Paulo é sempre UTC-3.
const TZ = '-03:00'
const OPEN_BEFORE_MIN = 30
const CLOSE_AFTER_MIN = 60

// Lista estendida: horas a partir do início do encontro, para quem só consegue ver o material depois (à noite)
export const JANELAS_ESTENDIDAS = [48, 72, 168] as const

export function statusOf(t: Pick<Training, 'date' | 'start_time' | 'end_time' | 'state' | 'keep_open_hours'>, now = new Date()): Status {
  if (t.state === 'open') return 'live'
  if (t.state === 'closed') return 'done'
  const inicio = new Date(`${t.date}T${t.start_time.slice(0, 5)}:00${TZ}`).getTime()
  const start = inicio - OPEN_BEFORE_MIN * 60e3
  const end = Math.max(
    new Date(`${t.date}T${t.end_time.slice(0, 5)}:00${TZ}`).getTime() + CLOSE_AFTER_MIN * 60e3,
    inicio + (t.keep_open_hours ?? 0) * 3600e3,
  )
  const n = now.getTime()
  if (n < start) return 'sched'
  if (n > end) return 'done'
  return 'live'
}

// "O link aceita assinaturas das 13:30 às 17:00" — 30 min antes do início até 1 h depois do término
export function janelaTexto(date: string, start: string, end: string, horas?: number | null) {
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || end <= start) return 'Início e término são o horário do encontro.'
  const shift = (t: string, min: number) => {
    const [h, m] = t.split(':').map(Number)
    const total = Math.max(0, Math.min(23 * 60 + 59, h * 60 + m + min))
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }
  const day = date ? ` do dia ${date.split('-').reverse().join('/')}` : ''
  if (horas && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    // fim em horário de Brasília: desloca para UTC-3 e lê os campos em UTC
    const fim = new Date(new Date(`${date}T${start}:00${TZ}`).getTime() + (horas - 3) * 3600e3)
    const dd = (n: number) => String(n).padStart(2, '0')
    const [, m, d] = date.split('-')
    return `O link aceita assinaturas das ${shift(start, -OPEN_BEFORE_MIN)} do dia ${d}/${m} até as ${dd(fim.getUTCHours())}:${dd(fim.getUTCMinutes())} do dia ${dd(fim.getUTCDate())}/${dd(fim.getUTCMonth() + 1)}; se precisar, você encerra antes pelo painel.`
  }
  return `Início e término são o horário do encontro. O link aceita assinaturas das ${shift(start, -OPEN_BEFORE_MIN)} às ${shift(end, CLOSE_AFTER_MIN)}${day}; se precisar, você abre ou encerra na hora pelo painel.`
}

// máscara do campo de CNPJ enquanto a pessoa digita
export const maskCnpjInput = (v: string) =>
  onlyDigits(v).slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')

export function todayISO(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now)
}

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

const parts = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }
}
export const dayNum = (iso: string) => parts(iso).d
export const monthShort = (iso: string) => MES[parts(iso).m - 1]
export const longDate = (iso: string) => {
  const p = parts(iso)
  return `${SEMANA[p.wd]}, ${p.d} de ${MES_LONGO[p.m - 1]}`
}
export const brDate = (iso: string) => iso.split('-').reverse().join('/')
export const hm = (t: string) => t.slice(0, 5)

export function daysUntil(iso: string, now = new Date()) {
  const a = parts(todayISO(now)), b = parts(iso)
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 864e5)
}
export function whenText(iso: string) {
  const n = daysUntil(iso)
  return n === 0 ? 'hoje' : n === 1 ? 'amanhã' : `em ${n} dias`
}

export const timeSP = (ts: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(ts))

export const onlyDigits = (v: string) => v.replace(/\D/g, '')
export const fmtCpf = (c: string) => c.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
export const maskCpf = (c: string) => (c.startsWith('*') ? c : `***.${c.slice(3, 6)}.${c.slice(6, 9)}-**`)
export const fmtCnpj = (c: string) => c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')

export function cpfValid(v: string) {
  const c = onlyDigits(v)
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false
  const dv = (n: number) => {
    let s = 0
    for (let i = 0; i < n; i++) s += +c[i] * (n + 1 - i)
    const r = (s * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(9) === +c[9] && dv(10) === +c[10]
}

export function cnpjValid(v: string) {
  const c = onlyDigits(v)
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false
  const calc = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const s = w.reduce((acc, wi, i) => acc + +c[i] * wi, 0)
    const r = s % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(12) === +c[12] && calc(13) === +c[13]
}

export const initials = (n: string) =>
  n.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()

// Cor do projeto na interface, estável pelo id (paleta Contraste).
const SWATCHES = ['p-pink', 'p-lilac', 'p-outline', 'p-grey'] as const
export function swatch(id: string) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0
  return SWATCHES[Math.abs(h) % SWATCHES.length]
}
