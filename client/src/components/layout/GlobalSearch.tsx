import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Search, Trophy, User as UserIcon, X } from 'lucide-react'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SearchResults {
  tournaments: { _id: string; name: string; slug: string; status: string; sport?: { name: string } }[]
  clubs: { _id: string; name: string; orgType: string; city?: string; country?: string }[]
  players: { _id: string; name: string; country?: string }[]
}

const EMPTY: SearchResults = { tournaments: [], clubs: [], players: [] }

export function GlobalSearch() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>(EMPTY)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(EMPTY)
      return
    }
    setLoading(true)
    const handle = setTimeout(() => {
      api
        .get('/public/search', { params: { q: query } })
        .then((res) => setResults(res.data.data))
        .catch(() => setResults(EMPTY))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(handle)
  }, [query])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function close() {
    setOpen(false)
    setQuery('')
    setResults(EMPTY)
  }

  const hasResults = results.tournaments.length > 0 || results.clubs.length > 0 || results.players.length > 0
  const showDropdown = open && query.trim().length >= 2

  return (
    <div ref={containerRef} className="relative hidden md:block">
      {open ? (
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search tournaments, clubs, players…"
            className="pl-9 pr-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={close} aria-label="Close search">
            <X className="h-4 w-4" />
          </button>

          {showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-2 max-h-96 overflow-y-auto rounded-lg border border-border bg-popover p-2 shadow-md">
              {loading && <p className="px-2 py-3 text-sm text-muted-foreground">Searching…</p>}
              {!loading && !hasResults && <p className="px-2 py-3 text-sm text-muted-foreground">No results for "{query}".</p>}

              {results.tournaments.length > 0 && (
                <div className="mb-2">
                  <p className="px-2 py-1 text-xs font-medium uppercase text-muted-foreground">Tournaments</p>
                  {results.tournaments.map((t) => (
                    <button
                      key={t._id}
                      onClick={() => {
                        navigate(`/t/${t.slug}`)
                        close()
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <Trophy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{t.name}</span>
                      {t.sport && <span className="ml-auto shrink-0 text-xs text-muted-foreground">{t.sport.name}</span>}
                    </button>
                  ))}
                </div>
              )}

              {results.clubs.length > 0 && (
                <div className="mb-2">
                  <p className="px-2 py-1 text-xs font-medium uppercase text-muted-foreground">Clubs &amp; organizations</p>
                  {results.clubs.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => {
                        navigate(`/clubs/${c._id}`)
                        close()
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{c.name}</span>
                      {c.city && <span className="ml-auto shrink-0 text-xs text-muted-foreground">{c.city}</span>}
                    </button>
                  ))}
                </div>
              )}

              {results.players.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-xs font-medium uppercase text-muted-foreground">Players</p>
                  {results.players.map((p) => (
                    <div key={p._id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
                      <UserIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{p.name}</span>
                      {p.country && <span className="ml-auto shrink-0 text-xs text-muted-foreground">{p.country}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Search">
          <Search className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
