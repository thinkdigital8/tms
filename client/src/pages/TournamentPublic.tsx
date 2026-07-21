import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarDays, MapPin, Mail, Phone, Globe, Share2, Trophy, Radio } from 'lucide-react'
import { api } from '@/lib/api'
import type { Tournament, TournamentCategory, Match } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate, formatDateTime } from '@/lib/utils'
import { toast } from '@/store/toast'

interface PublicPayload {
  tournament: Tournament
  categories: TournamentCategory[]
  sponsors: { _id: string; name: string; logoUrl?: string; tier: string }[]
  liveMatches: Match[]
  upcomingMatches: Match[]
}

function sideLabel(side: Match['sideA']) {
  if (side.label) return side.label
  if (typeof side.registration === 'object' && side.registration) {
    const reg = side.registration as { player?: { name?: string } | string; team?: { name?: string } | string }
    if (reg.player && typeof reg.player === 'object') return reg.player.name
    if (reg.team && typeof reg.team === 'object') return reg.team.name
  }
  if (typeof side.team === 'object' && side.team) return side.team.name
  return 'TBD'
}

export default function TournamentPublic() {
  const { slug } = useParams()
  const [data, setData] = useState<PublicPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    api
      .get(`/public/tournaments/${slug}`)
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-20 text-center text-muted-foreground">Loading tournament…</div>
  if (!data) return <div className="mx-auto max-w-5xl px-4 py-20 text-center text-muted-foreground">Tournament not found.</div>

  const { tournament: t, categories, sponsors, liveMatches, upcomingMatches } = data
  const sport = typeof t.sport === 'object' ? t.sport.name : ''

  function share() {
    if (navigator.share) {
      navigator.share({ title: t.name, url: window.location.href }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast({ title: 'Link copied to clipboard' })
    }
  }

  return (
    <div>
      <div
        className="h-56 w-full bg-gradient-to-br from-primary/40 to-accent/50 sm:h-72"
        style={t.bannerUrl ? { backgroundImage: `url(${t.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      />

      <div className="mx-auto max-w-5xl px-4">
        <div className="-mt-12 mb-6 flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{sport}</Badge>
              <Badge variant="outline" className="capitalize">
                {t.type}
              </Badge>
              <Badge className="capitalize">{t.status.replaceAll('_', ' ')}</Badge>
            </div>
            <h1 className="text-2xl font-bold sm:text-3xl">{t.name}</h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> {formatDate(t.startDate)} – {formatDate(t.endDate)}
              </span>
              {t.primaryVenue && typeof t.primaryVenue === 'object' && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {t.primaryVenue.name}, {t.primaryVenue.city}
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={share}>
            <Share2 className="h-4 w-4" /> Share
          </Button>
        </div>

        {liveMatches.length > 0 && (
          <Card className="mb-6 border-destructive/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Radio className="h-4 w-4 animate-pulse text-destructive" /> Live now
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {liveMatches.map((m) => (
                <div key={m._id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>{sideLabel(m.sideA)}</span>
                    <span className="font-mono">{m.sets.map((s) => s.sideA).join('-')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{sideLabel(m.sideB)}</span>
                    <span className="font-mono">{m.sets.map((s) => s.sideB).join('-')}</span>
                  </div>
                  {typeof m.court === 'object' && m.court && <p className="mt-1 text-xs text-muted-foreground">Court: {m.court.name}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="mb-10">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <h2 className="mb-2 font-semibold">About</h2>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{t.description || 'No description provided.'}</p>
                {t.termsAndConditions && (
                  <>
                    <h2 className="mb-2 mt-6 font-semibold">Rules &amp; Terms</h2>
                    <p className="whitespace-pre-line text-sm text-muted-foreground">{t.termsAndConditions}</p>
                  </>
                )}
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Contact</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  {t.contact?.name && <p>{t.contact.name}</p>}
                  {t.contact?.email && (
                    <a href={`mailto:${t.contact.email}`} className="flex items-center gap-2 text-primary hover:underline">
                      <Mail className="h-4 w-4" /> {t.contact.email}
                    </a>
                  )}
                  {t.contact?.phone && (
                    <span className="flex items-center gap-2">
                      <Phone className="h-4 w-4" /> {t.contact.phone}
                    </span>
                  )}
                  {t.social?.website && (
                    <a href={t.social.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                      <Globe className="h-4 w-4" /> Website
                    </a>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="categories">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {categories.map((c) => (
                <Card key={c._id}>
                  <CardContent className="flex items-center justify-between pt-5">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {c.gender} · {c.ageGroup} · {c.format.replaceAll('_', ' ')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className="capitalize">
                        {c.status.replaceAll('_', ' ')}
                      </Badge>
                      {c.status !== 'draft' && (
                        <Link to={`/t/${t.slug}/bracket/${c._id}`} className="text-xs text-primary hover:underline">
                          View draw
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {categories.length === 0 && <p className="text-muted-foreground">No categories published yet.</p>}
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {upcomingMatches.length === 0 && <p className="p-4 text-sm text-muted-foreground">No matches scheduled yet.</p>}
              {upcomingMatches.map((m) => (
                <div key={m._id} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <p>
                      {sideLabel(m.sideA)} <span className="text-muted-foreground">vs</span> {sideLabel(m.sideB)}
                    </p>
                    {typeof m.court === 'object' && m.court && <p className="text-xs text-muted-foreground">Court {m.court.name}</p>}
                  </div>
                  <span className="text-muted-foreground">{m.scheduledAt ? formatDateTime(m.scheduledAt) : 'TBD'}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="sponsors">
            {sponsors.length === 0 ? (
              <p className="text-muted-foreground">No sponsors listed.</p>
            ) : (
              <div className="flex flex-wrap gap-6">
                {sponsors.map((s) => (
                  <div key={s._id} className="flex flex-col items-center gap-2">
                    {s.logoUrl ? (
                      <img src={s.logoUrl} alt={s.name} className="h-14 object-contain" />
                    ) : (
                      <div className="flex h-14 w-24 items-center justify-center rounded bg-muted">
                        <Trophy className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground capitalize">{s.tier}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
