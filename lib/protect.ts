import 'server-only'
import { timingSafeEqual } from 'node:crypto'
import { headers } from 'next/headers'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// Proteções do formulário público contra envios em massa.

type RateLimiter = { limit(opts: { key: string }): Promise<{ success: boolean }> }

export async function clientIp() {
  const h = await headers()
  return h.get('cf-connecting-ip') ?? h.get('x-forwarded-for')?.split(',')[0].trim() ?? 'desconhecido'
}

// Limite de envios por IP (binding SIGN_LIMITER do wrangler.jsonc).
// Uma escola inteira pode sair pelo mesmo IP, por isso o limite é folgado.
// Fora da Cloudflare (ex.: `next dev`) o binding não existe e a checagem é ignorada.
export async function withinRateLimit(key: string, binding: 'SIGN_LIMITER' | 'LOGIN_LIMITER' = 'SIGN_LIMITER') {
  let limiter: RateLimiter | undefined
  try {
    limiter = (getCloudflareContext().env as unknown as Record<string, RateLimiter | undefined>)[binding]
  } catch {
    return true
  }
  if (!limiter) return true
  const { success } = await limiter.limit({ key })
  return success
}

// Verificação "não sou robô" (Cloudflare Turnstile). Só é exigida quando a chave secreta
// estiver configurada (TURNSTILE_SECRET_KEY); sem ela, o formulário funciona como antes.
export const turnstileEnabled = () => Boolean(process.env.TURNSTILE_SECRET_KEY)

export async function verifyTurnstile(token: string, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  if (!token) return false
  const body = new FormData()
  body.append('secret', secret)
  body.append('response', token)
  body.append('remoteip', ip)
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}

// Scripts do Google Forms → Central: "Authorization: Bearer <FORMS_SECRET>", comparado em tempo constante.
export function formsAutorizado(req: Request) {
  const segredo = process.env.FORMS_SECRET
  const recebido = Buffer.from((req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, ''))
  return Boolean(segredo) && recebido.length === Buffer.byteLength(segredo!) && timingSafeEqual(recebido, Buffer.from(segredo!))
}
