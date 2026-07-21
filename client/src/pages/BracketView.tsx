import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Match, Standing, Tournament } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface DrawPayload {
  draw: { _id: string; format: string; status: string; groups: { groupId: string; name: string }[] }
  rounds: { _id: string; roundNumber: number; name: string; groupId?: string }[]
  matches: Match[]
}

const KNOCKOUT_FORMATS = new Set(['single_elimination', 'double_elimination', 'team_knockout'])

function sideLabel(side: Match['sideA']) {
  if (side.label) return side.label
  if (typeof side.registration === 'object' && side.registration) {
    const reg = side.registration as { player?: { name?: string } | string; team?: { name?: string } | string }
    if (reg.player && typeof reg.player === 'object') return reg.player.name ?? 'TBD'
    if (reg.team && typeof reg.team === 'object') return reg.team.name ?? 'TBD'
  }
  if (typeof side.team === 'object' && side.team) return side.team.name
  return 'TBD'
}

function MatchCard({ match }: { match: Match }) {
  const aWon = match.winner === 'sideA'
  const bWon = match.winner === 'sideB'
  return (
    <div className="w-56 rounded-lg border border-border bg-card p-2 text-xs shadow-sm">
      <div className={cn('flex items-center justify-between rounded px-2 py-1', aWon && 'bg-success/15 font-semibold')}>
        <span className="truncate">{sideLabel(match.sideA)}</span>
        <span className="ml-2 font-mono">{match.sets.map((s) => s.sideA).join('-') || (match.isBye ? '' : '-')}</span>
      </div>
      <div className={cn('flex items-center justify-between rounded px-2 py-1', bWon && 'bg-success/15 font-semibold')}>
        <span className="truncate">{sideLabel(match.sideB)}</span>
        <span className="ml-2 font-mono">{match.sets.map((s) => s.sideB).join('-') || (match.isBye ? '' : '-')}</span>
      </div>
      {match.status === 'in_progress' && (
        <Badge variant="destructive" className="mt-1">
          Live
        </Badge>
      )}
    </div>
  )
}

function KnockoutBracket({ matches, side }: { matches: Match[]; side: 'winners' | 'losers' | 'all' }) {
  const filtered = side === 'all' ? matches : matches.filter((m) => m.bracketSide === side)
  const grouped = groupByRound(filtered)

  return (
    <div className="flex gap-8 overflow-x-auto pb-4">
      {grouped.map(([roundId, roundMatches], colIdx) => (
        <div key={roundId} className="flex flex-col justify-around gap-6" style={{ minWidth: 224 }}>
          {roundMatches.map((m) => (
            <div key={m._id} style={{ marginTop: colIdx === 0 ? 0 : undefined }}>
              <MatchCard match={m} />
            </div>
          ))}
        </div>
      ))}
      {grouped.length === 0 && <p className="text-muted-foreground">No matches yet.</p>}
    </div>
  )
}

function groupByRound(matches: Match[]): [string, Match[]][] {
  const map = new Map<string, Match[]>()
  for (const m of matches) {
    const list = map.get(m.round) ?? []
    list.push(m)
    map.set(m.round, list)
  }
  return [...map.entries()].sort((a, b) => a[1][0].matchNumber - b[1][0].matchNumber)
}

export default function BracketView() {
  const { slug, categoryId } = useParams()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [draw, setDraw] = useState<DrawPayload | null>(null)
  const [standings, setStandings] = useState<Standing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug || !categoryId) return
    api.get(`/tournaments/slug/${slug}`).then((res) => {
      const t = res.data.data as Tournament
      setTournament(t)
      api
        .get(`/tournaments/${t._id}/draws/category/${categoryId}`)
        .then((r) => setDraw(r.data.data))
        .catch(() => {})
      api
        .get(`/public/tournaments/${slug}/standings/${categoryId}`)
        .then((r) => setStandings(r.data.data))
        .catch(() => {})
        .finally(() => setLoading(false))
    })
  }, [slug, categoryId])

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-20 text-center text-muted-foreground">Loading bracket…</div>
  if (!draw) return <div className="mx-auto max-w-6xl px-4 py-20 text-center text-muted-foreground">No draw published for this category yet.</div>

  const isKnockout = KNOCKOUT_FORMATS.has(draw.draw.format)
  const isDoubleElim = draw.draw.format === 'double_elimination'
  const groups = draw.draw.groups

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tournament?.name}</h1>
          <p className="text-sm text-muted-foreground capitalize">{draw.draw.format.replaceAll('_', ' ')} draw</p>
        </div>
        <Badge className="capitalize">{draw.draw.status}</Badge>
      </div>

      {isKnockout ? (
        isDoubleElim ? (
          <Tabs defaultValue="winners">
            <TabsList>
              <TabsTrigger value="winners">Winners Bracket</TabsTrigger>
              <TabsTrigger value="losers">Losers Bracket</TabsTrigger>
              <TabsTrigger value="final">Grand Final</TabsTrigger>
            </TabsList>
            <TabsContent value="winners">
              <KnockoutBracket matches={draw.matches} side="winners" />
            </TabsContent>
            <TabsContent value="losers">
              <KnockoutBracket matches={draw.matches} side="losers" />
            </TabsContent>
            <TabsContent value="final">
              <KnockoutBracket matches={draw.matches.filter((m) => m.bracketSide === 'grand_final')} side="all" />
            </TabsContent>
          </Tabs>
        ) : (
          <KnockoutBracket matches={draw.matches} side="all" />
        )
      ) : groups.length > 0 ? (
        <Tabs defaultValue={groups[0]?.groupId}>
          <TabsList>
            {groups.map((g) => (
              <TabsTrigger key={g.groupId} value={g.groupId}>
                {g.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {groups.map((g) => (
            <TabsContent key={g.groupId} value={g.groupId}>
              <StandingsTable standings={standings.filter((s) => s.groupId === g.groupId)} />
              <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {draw.matches
                  .filter((m) => m.groupId === g.groupId)
                  .map((m) => (
                    <MatchCard key={m._id} match={m} />
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <>
          <StandingsTable standings={standings} />
          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {draw.matches.map((m) => (
              <MatchCard key={m._id} match={m} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function StandingsTable({ standings }: { standings: Standing[] }) {
  if (standings.length === 0) return <p className="text-sm text-muted-foreground">Standings will appear once matches are played.</p>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Player / Team</TableHead>
          <TableHead>P</TableHead>
          <TableHead>W</TableHead>
          <TableHead>L</TableHead>
          <TableHead>Pts</TableHead>
          <TableHead>Form</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {standings
          .sort((a, b) => a.rank - b.rank)
          .map((s) => (
            <TableRow key={s._id}>
              <TableCell>{s.rank}</TableCell>
              <TableCell>
                {typeof s.registration === 'object' && s.registration ? nameOfReg(s.registration) : typeof s.team === 'object' && s.team ? s.team.name : 'TBD'}
              </TableCell>
              <TableCell>{s.played}</TableCell>
              <TableCell>{s.won}</TableCell>
              <TableCell>{s.lost}</TableCell>
              <TableCell className="font-semibold">{s.matchPoints}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {s.form.map((f, i) => (
                    <span
                      key={i}
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white',
                        f === 'W' ? 'bg-success' : f === 'L' ? 'bg-destructive' : 'bg-muted-foreground'
                      )}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  )
}

function nameOfReg(reg: unknown) {
  const r = reg as { player?: { name?: string } | string; team?: { name?: string } | string }
  if (r.player && typeof r.player === 'object') return r.player.name
  if (r.team && typeof r.team === 'object') return r.team.name
  return 'TBD'
}
