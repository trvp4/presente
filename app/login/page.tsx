'use client'
import { useActionState } from 'react'
import { signIn, type LoginState } from './actions'
import { SignatureMark } from '@/components/ui'

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {})
  return (
    <main className="login">
      <form className="login-card" action={action}>
        <div className="login-logo"><SignatureMark size={44} /></div>
        <div>
          <h1>Entrar no Presente</h1>
          <p>Acesso da equipe que cria e acompanha as listas de presença.</p>
        </div>
        <div className="f">
          <label htmlFor="email">Usuário</label>
          <input id="email" name="email" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="ex.: maria" required />
        </div>
        <div className="f">
          <label htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {state.error && <div className="err-box" role="alert">{state.error}</div>}
        <button className="btn btn-dark btn-lg" disabled={pending}>{pending ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </main>
  )
}
