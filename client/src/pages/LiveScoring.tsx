import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Minus, Pause, Play, Trophy, HeartPulse } from 'lucide-react'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { useAuthStore } from '@/store/auth'
import { toast } from '@/store/toast'
import type { Match, SetScore } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const SCORING_ROLES = new Set(['super_admin', 'tournament_admin', 'organizer', 'referee', 'umpire'])

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

export default function LiveScoring() {
  const { matchId } = useParams()
  const { user } = useAuthStore()
  const [match, setMatch] = useState<Match | null>(null)
  const [sets, setSets] = useState<SetScore[]>([])
  const [saving, setSaving] = useState(false)

  const canScore = !!user && SCORING_ROLES.has(user.role)

  useEffect(() => {
    if (!matchId) return
    api.get(`/matches/${matchId}`).then((res) => {
      setMatch(res.data.data)
      setSets(res.data.data.sets?.length ? res.data.data.sets : [{ setNumber: 1, sideA: 0, sideB: 0 }])
    })

    const socket = getSocket()
    socket.emit('join:match', matchId)
    const handler = (payload: { matchId: string; sets: SetScore[]; status: string; winner?: string }) => {
      if (payload.matchId !== matchId) return
      setMatch((m) => (m ? { ...m, sets: payload.sets, status: payload.status as Match['status'], winner: payload.winner as Match['winner'] } : m))
    }
    socket.on('match:update', handler)
    return () => {
      socket.emit('leave:match', matchId)
      socket.off('match:update', handler)
    }
  }, [matchId])

  const isLive = useMemo(() => match?.status === 'in_progress', [match])

  function updateSet(idx: number, side: 'sideA' | 'sideB', delta: number) {
    setSets((prev) => prev.map((s, i) => (i === idx ? { ...s, [side]: Math.max(0, s[side] + delta) } : s)))
  }

  function addSet() {
    setSets((prev) => [...prev, { setNumber: prev.length + 1, sideA: 0, sideB: 0 }])
  }

  async function saveScore() {
    if (!matchId) return
    setSaving(true)
    try {
      const { data } = await api.patch(`/matches/${matchId}/score`, { sets })
      setMatch(data.data)
      toast({ title: 'Score updated', variant: 'success' })
    } catch {
      toast({ title: 'Failed to save score', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function completeMatch(winner: 'sideA' | 'sideB', winReason: 'normal' | 'walkover' | 'retirement' | 'default' = 'normal') {
    if (!matchId) return
    setSaving(true)
    try {
      await saveScore()
      const { data } = await api.post(`/matches/${matchId}/complete`, { winner, winReason })
      setMatch(data.data)
      toast({ title: `${sideLabel(winner === 'sideA' ? match!.sideA : match!.sideB)} wins`, variant: 'success' })
    } catch {
      toast({ title: 'Failed to complete match', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function suspend() {
    if (!matchId) return
    const { data } = await api.post(`/matches/${matchId}/suspend`, { reason: 'Rain delay' })
    setMatch(data.data)
  }
  async function resume() {
    if (!matchId) return
    const { data } = await api.post(`/matches/${matchId}/resume`)
    setMatch(data.data)
  }
  async function medicalTimeout(side: 'sideA' | 'sideB') {
    if (!matchId) return
    await api.post(`/matches/${matchId}/medical-timeout`, { side })
    toast({ title: 'Medical timeout logged' })
  }

  if (!match) return <div className="mx-auto max-w-2xl px-4 py-20 text-center text-muted-foreground">Loading match…</div>

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Live Scoring</CardTitle>
          <div className="flex items-center gap-2">
            {isLive && <Badge variant="destructive">LIVE</Badge>}
            <Badge variant="outline" className="capitalize">
              {match.status.replaceAll('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid grid-cols-[1fr_auto] items-center gap-y-4">
            <span className="font-medium">{sideLabel(match.sideA)}</span>
            <span />
            <span className="font-medium">{sideLabel(match.sideB)}</span>
            <span />
          </div>

          <div className="flex flex-col gap-3">
            {sets.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                <span className="w-16 text-xs text-muted-foreground">Set {s.setNumber}</span>
                <div className="flex flex-1 items-center justify-between">
                  <ScoreControl value={s.sideA} onChange={(d) => updateSet(idx, 'sideA', d)} disabled={!canScore} />
                  <span className="px-3 text-muted-foreground">–</span>
                  <ScoreControl value={s.sideB} onChange={(d) => updateSet(idx, 'sideB', d)} disabled={!canScore} />
                </div>
              </div>
            ))}
          </div>

          {canScore && (
            <>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={addSet}>
                  <Plus className="h-4 w-4" /> Add set
                </Button>
                <Button variant="outline" size="sm" onClick={saveScore} disabled={saving}>
                  Save score
                </Button>
                {match.status === 'suspended' ? (
                  <Button variant="outline" size="sm" onClick={resume}>
                    <Play className="h-4 w-4" /> Resume
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={suspend}>
                    <Pause className="h-4 w-4" /> Suspend
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => medicalTimeout('sideA')}>
                  <HeartPulse className="h-4 w-4" /> Medical TO
                </Button>
              </div>

              <div className="rounded-lg border border-border p-4">
                <p className="mb-3 text-sm font-medium">Finish match</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => completeMatch('sideA')} disabled={saving}>
                    <Trophy className="h-4 w-4" /> {sideLabel(match.sideA)} wins
                  </Button>
                  <Button onClick={() => completeMatch('sideB')} disabled={saving}>
                    <Trophy className="h-4 w-4" /> {sideLabel(match.sideB)} wins
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Button variant="secondary" size="sm" onClick={() => completeMatch('sideA', 'walkover')}>
                    Walkover A
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => completeMatch('sideB', 'walkover')}>
                    Walkover B
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => completeMatch('sideA', 'retirement')}>
                    Retirement
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ScoreControl({ value, onChange, disabled }: { value: number; onChange: (delta: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {!disabled && (
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onChange(-1)}>
          <Minus className="h-3 w-3" />
        </Button>
      )}
      <span className="w-8 text-center text-xl font-bold">{value}</span>
      {!disabled && (
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onChange(1)}>
          <Plus className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
