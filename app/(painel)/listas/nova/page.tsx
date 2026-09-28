import Link from 'next/link'
import { getStaff } from '@/lib/supabase/server'
import { siteOrigin } from '@/lib/origin'
import { todayISO, type Project } from '@/lib/format'
import Wizard, { type DoPlano, type School } from './Wizard'

export const metadata = { title: 'Criar lista' }

export default async function Page({ searchParams }: { searchParams: Promise<{ plano?: string }> }) {
  const { supabase, name: me } = await getStaff()
  const { plano: planoId } = await searchParams
  // "Criar lista" num item do plano de capacitações: projeto, tema, data, hora e escola já preenchidos
  let plano: DoPlano | undefined
  if (planoId) {
    const { data: i } = await supabase.from('plano_capacitacoes')
      .select('id, project_id, tipo, data_prevista, hora, cidade, training_id, school:schools(nome, cnpj, cidade)').eq('id', planoId).maybeSingle()
    const escola = i?.school as unknown as { nome: string; cnpj: string | null; cidade: string | null } | null
    if (i && !i.training_id)
      plano = { plano_id: i.id, project_id: i.project_id, title: i.tipo, date: i.data_prevista ?? '', start: i.hora ?? '',
        school: escola?.nome ?? '', cnpj: escola?.cnpj ?? '', city: escola?.cidade ?? '' }
  }
  const { data } = await supabase.from('projects').select('id, name, pronac, logo, archived').eq('archived', false).not('pronac', 'is', null).order('name') // sem Pronac: só Espaços de Leitura
  const projects = (data ?? []) as Project[]

  // escolas já usadas em listas anteriores, para preencher CNPJ e cidade sozinho
  const { data: past } = await supabase
    .from('trainings')
    .select('beneficiary_name, beneficiary_cnpj, city')
    .not('beneficiary_name', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)
  const seen = new Set<string>()
  const schools: School[] = []
  for (const s of past ?? []) {
    const key = (s.beneficiary_name as string).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    schools.push({ name: s.beneficiary_name as string, cnpj: (s.beneficiary_cnpj as string) ?? '', city: (s.city as string) ?? '' })
  }

  // instrutores: quem está logado, a equipe e quem já deu capacitação antes
  const { data: staff } = await supabase.from('staff').select('name')
  const { data: pastInstr } = await supabase.from('trainings').select('instructor').not('instructor', 'is', null).order('created_at', { ascending: false }).limit(200)
  const instructors = [...new Set([me, ...(staff ?? []).map(s => s.name), ...(pastInstr ?? []).map(t => t.instructor)]
    .filter((n): n is string => Boolean(n && n.trim())).map(n => n.trim()))]

  return (
    <section className="view" style={{ alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Link className="back" href="/listas">← Minhas listas</Link>
        <div className="head"><h1>Criar lista de presença</h1></div>
      </div>
      {projects.length ? (
        <Wizard projects={projects} schools={schools} instructors={instructors} origin={await siteOrigin()} today={todayISO()} plano={plano} />
      ) : (
        <div className="wizard">
          <span className="hand wipe">Nenhum projeto cadastrado ainda…</span>
          <p style={{ margin: 0, color: 'var(--muted)' }}>Cadastre o projeto com nome, Pronac e logo. Esses dados vão no cabeçalho de todas as listas dele.</p>
          <div><Link className="btn btn-dark" href="/projetos">Cadastrar projeto</Link></div>
        </div>
      )}
    </section>
  )
}
