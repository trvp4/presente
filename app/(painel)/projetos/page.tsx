import { getStaff } from '@/lib/supabase/server'
import type { Project } from '@/lib/format'
import NewProject from './NewProject'
import ProjectRow from './ProjectRow'

export const metadata = { title: 'Projetos' }

export default async function Page() {
  const { supabase } = await getStaff()
  const { data } = await supabase
    .from('projects')
    .select('id, name, pronac, logo, archived, trainings(count)')
    .order('archived')
    .order('name')
  const projects = (data ?? []) as (Project & { trainings: { count: number }[] })[]

  return (
    <section className="view">
      <div className="head">
        <div>
          <h1>Projetos</h1>
          <p>Nome, Pronac e logo de cada projeto vão no cabeçalho da lista de presença. A escola, o CNPJ dela e a cidade são informados em cada lista.</p>
        </div>
      </div>
      <NewProject />
      {projects.length ? (
        <>
          <div className="plist">
            {projects.map(p => <ProjectRow key={p.id} p={p} listas={p.trainings?.[0]?.count ?? 0} />)}
          </div>
          <p className="hint">Projeto sem listas pode ser excluído. Projeto com listas pode ser <b>arquivado</b>: some da criação de listas, mas o histórico e os documentos continuam. Projeto <b>sem Pronac</b> veio do Espaços de Leitura: cadastre o Pronac para usá-lo em listas de presença.</p>
        </>
      ) : (
        <div className="empty"><span className="hand wipe">Nenhum projeto ainda…</span><br />Cadastre o primeiro acima.</div>
      )}
    </section>
  )
}
