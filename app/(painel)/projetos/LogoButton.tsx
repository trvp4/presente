'use client'
import { useRef, useTransition } from 'react'
import { fileToLogo, toast } from '@/components/client'
import { setProjectLogo } from '../actions'

// Troca o logo de um projeto já cadastrado.
export default function LogoButton({ id, hasLogo }: { id: string; hasLogo: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [pending, start] = useTransition()
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const logo = await fileToLogo(f)
      start(async () => { await setProjectLogo(id, logo); toast('Logo atualizado') })
    } catch (err) { toast((err as Error).message) }
  }
  return (
    <>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pick} />
      <button type="button" className="linkish" disabled={pending} onClick={() => input.current?.click()}>
        {pending ? 'Enviando…' : hasLogo ? 'Trocar logo' : 'Adicionar logo'}
      </button>
    </>
  )
}
