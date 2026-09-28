import { redirect } from 'next/navigation'
import { getStaff } from '@/lib/supabase/server'
import { signOut } from '../login/actions'
import RailNav from './RailNav'

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const { email, name, isStaff } = await getStaff()
  if (!email) redirect('/login')

  if (!isStaff) {
    return (
      <main className="login">
        <div className="login-card">
          <h1>Acesso não liberado</h1>
          <p>
            O e-mail <b>{email}</b> entrou, mas ainda não está na equipe do Presente. Peça para quem administra o
            sistema incluir seu e-mail na tabela <span className="mono">staff</span>.
          </p>
          <form action={signOut}><button className="btn btn-ghost">Sair</button></form>
        </div>
      </main>
    )
  }

  return (
    <div className="app">
      <RailNav email={email} name={name} />
      <main className="main">{children}</main>
    </div>
  )
}
