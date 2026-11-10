import 'server-only'

// Leitura de planilhas do Google com a conta de serviço do Presente (só leitura).
// A chave fica no segredo GOOGLE_CONTA_SERVICO (o JSON baixado no Google Cloud), cadastrado pelo
// assistente (`npm run assistente -- google`). A planilha precisa estar compartilhada com o e-mail da conta.

type Chave = { client_email: string; private_key: string }

const b64url = (dados: ArrayBuffer | string) =>
  Buffer.from(typeof dados === 'string' ? dados : new Uint8Array(dados)).toString('base64url')

function chave(): Chave {
  const bruto = process.env.GOOGLE_CONTA_SERVICO
  if (!bruto) throw new Error('falta o segredo GOOGLE_CONTA_SERVICO')
  // o assistente guarda o JSON em base64 (uma linha só, sem aspas para escapar nos arquivos .env)
  const json = bruto.trim().startsWith('{') ? bruto : Buffer.from(bruto.trim(), 'base64').toString('utf8')
  const c = JSON.parse(json) as Partial<Chave>
  if (!c.client_email || !c.private_key) throw new Error('GOOGLE_CONTA_SERVICO não é a chave JSON de uma conta de serviço')
  return c as Chave
}

/** E-mail com que a planilha deve ser compartilhada. */
export const emailDaConta = () => chave().client_email

async function token() {
  const c = chave()
  const agora = Math.floor(Date.now() / 1000)
  const cabeca = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const corpo = b64url(JSON.stringify({
    iss: c.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token', iat: agora, exp: agora + 3600,
  }))
  const der = Buffer.from(c.private_key.replace(/-----[^-]+-----|\s/g, ''), 'base64')
  const k = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const assinatura = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', k, new TextEncoder().encode(`${cabeca}.${corpo}`))
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${cabeca}.${corpo}.${b64url(assinatura)}` }),
  })
  if (!r.ok) throw new Error(`o Google recusou a conta de serviço (${r.status})`)
  return ((await r.json()) as { access_token: string }).access_token
}

/**
 * Lê a aba de respostas do formulário (a "Respostas ao formulário…", ou a primeira aba) sem formatação:
 * datas vêm como número de dias, no fuso da planilha, que também é devolvido.
 */
export async function lerRespostas(planilha: string): Promise<{ fuso: string; linhas: unknown[][] }> {
  const t = await token()
  const api = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(planilha)}`
  const cab = { Authorization: `Bearer ${t}` }

  const info = await fetch(`${api}?fields=properties.timeZone,sheets.properties.title`, { headers: cab })
  if (info.status === 403 || info.status === 404) throw new Error('a planilha não foi compartilhada com a conta do Presente (ou o link está errado)')
  if (!info.ok) throw new Error(`o Google não abriu a planilha (${info.status})`)
  const meta = (await info.json()) as { properties: { timeZone: string }; sheets: { properties: { title: string } }[] }
  const abas = meta.sheets.map(s => s.properties.title)
  const aba = abas.find(a => /^(respostas ao formul|form responses)/i.test(a)) ?? abas[0]

  const v = await fetch(`${api}/values/${encodeURIComponent(`'${aba.replace(/'/g, "''")}'`)}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`, { headers: cab })
  if (!v.ok) throw new Error(`o Google não entregou as respostas (${v.status})`)
  return { fuso: meta.properties.timeZone, linhas: ((await v.json()) as { values?: unknown[][] }).values ?? [] }
}
