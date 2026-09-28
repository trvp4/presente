'use client'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

// Busca entre todos os municípios do Brasil (lista do IBGE em lib/cidades.json).
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s*[-–]\s*/g, ' ').trim()

export default function CityPicker({ value, onChange, id = 'city', name = 'city', invalid }: {
  value: string
  onChange: (v: string) => void
  id?: string
  name?: string
  invalid?: boolean
}) {
  const [cities, setCities] = useState<string[] | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  const box = useRef<HTMLDivElement>(null)

  const load = () => {
    if (!cities) import('@/lib/cidades.json').then(m => setCities(m.default as string[]))
  }

  const matches = useMemo(() => {
    if (!cities) return []
    const q = norm(value)
    if (q.length < 2) return []
    const starts: string[] = [], contains: string[] = []
    for (const c of cities) {
      const n = norm(c)
      if (n.startsWith(q)) starts.push(c)
      else if (contains.length < 8 && n.includes(q)) contains.push(c)
    }
    // nomes mais curtos primeiro: "São Paulo – SP" antes de "São Patrício – GO"
    starts.sort((a, b) => a.split(' – ')[0].length - b.split(' – ')[0].length || a.localeCompare(b, 'pt-BR'))
    return [...starts, ...contains].slice(0, 8)
  }, [cities, value])

  useEffect(() => setActive(0), [value])
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const choose = (c: string) => { onChange(c); setOpen(false) }
  const onKey = (e: React.KeyboardEvent) => {
    if (!open || !matches.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => (a + 1) % matches.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => (a - 1 + matches.length) % matches.length) }
    else if (e.key === 'Enter') { e.preventDefault(); choose(matches[active]) }
    else if (e.key === 'Escape') setOpen(false)
  }
  const exact = cities?.includes(value)

  return (
    <div className="combo" ref={box}>
      <input
        id={id}
        name={name}
        value={value}
        autoComplete="off"
        placeholder="Digite para buscar a cidade"
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        onFocus={() => { load(); setOpen(true) }}
        onChange={e => { load(); onChange(e.target.value); setOpen(true) }}
        onKeyDown={onKey}
      />
      {exact && <span className="combo-ok" aria-hidden="true">✓</span>}
      {open && matches.length > 0 && !exact && (
        <ul className="combo-list" id={listId} role="listbox">
          {matches.map((c, i) => (
            <li key={c} role="option" aria-selected={i === active} className={i === active ? 'on' : ''}
              onMouseDown={e => { e.preventDefault(); choose(c) }} onMouseEnter={() => setActive(i)}>
              {c.split(' – ')[0]} <small>{c.split(' – ')[1]}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
