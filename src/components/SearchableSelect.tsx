import { useEffect, useRef, useState } from 'react'

interface Option {
  value: string
  label: string
}

interface Props {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function SearchableSelect({ options, value, onChange, placeholder = 'Search...' }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase())
  )

  const selectedLabel = options.find((o) => o.value === value)?.label || placeholder

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left truncate rounded-[0.65rem] px-3 py-2 text-[0.8rem] border border-black/15 dark:border-white/15 bg-white/70 dark:bg-white/10 text-black dark:text-white hover:bg-(--g-hover) transition-colors"
      >
        {selectedLabel}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-56 max-h-64 overflow-hidden flex flex-col rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-[#1f1a1a] text-black dark:text-white shadow-xl">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="px-3 py-2 text-[0.8rem] bg-transparent border-b border-black/10 dark:border-white/15 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none"
          />
          <div className="overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-xs opacity-60 p-3">No results</p>
            )}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                  setQuery('')
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  o.value === value ? 'bg-(--g-accent) text-white' : 'hover:bg-(--g-hover)'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchableSelect
