import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trophy, Users, DollarSign, CalendarClock } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import type { Tournament } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'outline'> = {
  draft: 'outline',
  published: 'secondary',
  registration_open: 'success',
  registration_closed: 'warning',
  draw_published: 'default',
  in_progress: 'default',
  completed: 'secondary',
  cancelled: 'destructive' as never,
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    api
      .get('/tournaments', { params: { organizer: user._id, mine: 'true', limit: 50 } })
      .then((res) => setTournaments(res.data.data))
      .finally(() => setLoading(false))
  }, [user])

  const stats = [
    { label: 'Tournaments', value: tournaments.length, icon: Trophy },
    { label: 'Live now', value: tournaments.filter((t) => t.status === 'in_progress').length, icon: CalendarClock },
    { label: 'Open for registration', value: tournaments.filter((t) => t.status === 'registration_open').length, icon: Users },
    { label: 'Completed', value: tournaments.filter((t) => t.status === 'completed').length, icon: DollarSign },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizer Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Welcome back, {user?.name}.</p>
        </div>
        <Button asChild>
          <Link to="/tournaments/new">
            <Plus className="h-4 w-4" /> New Tournament
          </Link>
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center justify-between pt-5">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
              <s.icon className="h-8 w-8 text-primary/60" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your tournaments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : tournaments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              You haven't created any tournaments yet.
              <div className="mt-4">
                <Button asChild>
                  <Link to="/tournaments/new">Create your first tournament</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tournaments.map((t) => (
                <Link
                  key={t._id}
                  to={`/tournaments/${t._id}/manage`}
                  className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(t.startDate)} – {formatDate(t.endDate)}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[t.status] ?? 'outline'}>{t.status.replaceAll('_', ' ')}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
