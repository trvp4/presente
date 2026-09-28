// Mostra as Listas de Presença recebendo assinaturas agora (mesma regra do sistema: lib/format.ts).
// Sai com código 0 se nenhuma estiver aberta e 2 se houver alguma; usado antes de publicar.
import { adminClient } from './env.mjs'
import { statusOf } from '../lib/format.ts'

const { data, error } = await adminClient()
  .from('trainings')
  .select('title, date, start_time, end_time, state, keep_open_hours, code')
  // listas de ontem em diante, mais qualquer uma aberta manualmente
  .or(`date.gte.${new Date(Date.now() - 864e5).toISOString().slice(0, 10)},state.eq.open`)
if (error) {
  console.error(`Não consegui consultar as listas: ${error.message}`)
  process.exitCode = 1
} else {
  const abertas = data.filter(t => statusOf(t) === 'live')
  if (!abertas.length) {
    console.log('Nenhuma lista recebendo assinaturas agora.')
  } else {
    console.log('Listas recebendo assinaturas agora:')
    for (const t of abertas) console.log(`  • ${t.title} (${t.date} ${t.start_time.slice(0, 5)}–${t.end_time.slice(0, 5)}) /p/${t.code}`)
    process.exitCode = 2
  }
}
