import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, MapPin, Search } from 'lucide-react'
import { api } from '@/lib/api'
import type { Tournament } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  public: 'Public',
  private: 'Private',
  club: 'Club',
  academy: 'Academy',
  corporate: 'Corporate',
  national: 'National',
  international: 'International',
}

export default function TournamentsList() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    api
      .get('/tournaments', { params: { q: q || undefined, limit: 30 }, signal: controller.signal })
      .then((res) => setTournaments(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [q])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tournaments</h1>
          <p className="mt-1 text-muted-foreground">Pickleball, badminton, tennis, table tennis, squash &amp; padel — all in one place.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tournaments…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <p className="py-20 text-center text-muted-foreground">No tournaments found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <Link key={t._id} to={`/t/${t.slug}`}>
              <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                <div className="h-32 w-full bg-gradient-to-br from-primary/30 to-accent/40" style={t.bannerUrl ? { backgroundImage: `url(${t.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
                <CardContent className="pt-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline">{TYPE_LABELS[t.type] ?? t.type}</Badge>
                    {typeof t.sport === 'object' && <Badge variant="secondary">{t.sport.name}</Badge>}
                  </div>
                  <h3 className="line-clamp-1 font-semibold">{t.name}</h3>
                  <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(t.startDate)} – {formatDate(t.endDate)}
                  </div>
                  {t.primaryVenue && typeof t.primaryVenue === 'object' && (
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {t.primaryVenue.city}, {t.primaryVenue.country}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
