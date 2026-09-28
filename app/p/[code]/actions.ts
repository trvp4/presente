'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { statusOf, timeSP, type Training } from '@/lib/format'
import { limiteDePresencas, validarPresenca, type CampoPresenca } from '@/lib/presenca'
import { clientIp, verifyTurnstile, withinRateLimit } from '@/lib/protect'

export type SignResult =
  | { ok: true; time: string }
  | { ok: false; errors: Partial<Record<CampoPresenca | 'form', string>> }

// Grava a presença do voluntário depois de validar tudo no servidor.
export async function signAttendance(input: {
  code: string
  name: string
  role: string
  cpf: string
  signature: string
  consent: boolean
  captcha?: string
}): Promise<SignResult> {
  const ip = await clientIp()
  if (!(await withinRateLimit(`sign:${ip}`)))
    return { ok: false, errors: { form: 'Muitos envios seguidos deste aparelho ou rede. Aguarde um minuto e tente de novo.' } }

  const v = validarPresenca(input)
  if (!v.ok) return v
  const { name, role, cpf, signature } = v.presenca

  if (!(await verifyTurnstile(String(input.captcha ?? ''), ip)))
    return { ok: false, errors: { form: 'Não foi possível confirmar que o envio é de uma pessoa. Recarregue a página e tente de novo.' } }

  const admin = createAdminClient()
  const { data: t } = await admin
    .from('trainings')
    .select('id, date, start_time, end_time, state, keep_open_hours, expected_count')
    .eq('code', String(input.code ?? ''))
    .maybeSingle()
  if (!t) return { ok: false, errors: { form: 'Link de presença não encontrado.' } }
  if (statusOf(t as Training) !== 'live') return { ok: false, errors: { form: 'Esta lista não está recebendo presenças agora.' } }

  const { count } = await admin.from('attendances').select('id', { count: 'exact', head: true }).eq('training_id', t.id)
  if ((count ?? 0) >= limiteDePresencas(t.expected_count))
    return { ok: false, errors: { form: 'Esta lista atingiu o limite de assinaturas. Fale com a pessoa responsável pela capacitação.' } }

  const { data, error } = await admin
    .from('attendances')
    .insert({ training_id: t.id, full_name: name, role, cpf, signature })
    .select('created_at')
    .single()
  if (error) {
    if (error.code === '23505') return { ok: false, errors: { cpf: 'Este CPF já assinou esta lista.' } }
    return { ok: false, errors: { form: 'Não foi possível registrar agora. Tente de novo em instantes.' } }
  }
  return { ok: true, time: timeSP(data.created_at) }
}
