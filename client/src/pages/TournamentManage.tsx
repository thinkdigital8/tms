import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download, Rocket, ShieldCheck, Wand2 } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from '@/store/toast'
import type { Registration, Tournament, TournamentCategory, TournamentStatus } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const NEXT_STATUS: Partial<Record<TournamentStatus, TournamentStatus>> = {
  draft: 'published',
  published: 'registration_open',
  registration_open: 'registration_closed',
  registration_closed: 'draw_published',
  draw_published: 'in_progress',
  in_progress: 'completed',
}

const REPORTS = ['registrations', 'revenue', 'attendance', 'categories', 'court-usage', 'sponsors', 'financial', 'results']

export default function TournamentManage() {
  const { id } = useParams()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [categories, setCategories] = useState<TournamentCategory[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)

  async function refresh() {
    if (!id) return
    const [t, cats, regs] = await Promise.all([
      api.get(`/tournaments/${id}`),
      api.get(`/tournaments/${id}/categories`),
      api.get(`/tournaments/${id}/registrations`),
    ])
    setTournament(t.data.data)
    setCategories(cats.data.data)
    setRegistrations(regs.data.data)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function advanceStatus() {
    if (!tournament) return
    const next = NEXT_STATUS[tournament.status]
    if (!next) return
    try {
      await api.post(`/tournaments/${tournament._id}/transition`, { status: next })
      toast({ title: `Tournament moved to ${next.replaceAll('_', ' ')}`, variant: 'success' })
      refresh()
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast({ title: 'Could not update status', description: message, variant: 'destructive' })
    }
  }

  async function generateDraw(categoryId: string) {
    if (!tournament) return
    try {
      await api.post(`/tournaments/${tournament._id}/draws/generate`, { categoryId })
      toast({ title: 'Draw generated', variant: 'success' })
      refresh()
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast({ title: 'Could not generate draw', description: message, variant: 'destructive' })
    }
  }

  async function approveRegistration(regId: string) {
    if (!tournament) return
    await api.patch(`/tournaments/${tournament._id}/registrations/${regId}/approve`)
    toast({ title: 'Registration approved', variant: 'success' })
    refresh()
  }
  async function rejectRegistration(regId: string) {
    if (!tournament) return
    await api.patch(`/tournaments/${tournament._id}/registrations/${regId}/reject`)
    toast({ title: 'Registration rejected' })
    refresh()
  }

  function downloadReport(type: string) {
    if (!tournament) return
    window.open(`/api/tournaments/${tournament._id}/reports/${type}?format=csv`, '_blank')
  }

  if (loading || !tournament) return <div className="mx-auto max-w-6xl px-4 py-20 text-center text-muted-foreground">Loading…</div>

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          <Badge className="mt-1 capitalize">{tournament.status.replaceAll('_', ' ')}</Badge>
        </div>
        <div className="flex gap-2">
          {NEXT_STATUS[tournament.status] && (
            <Button onClick={advanceStatus}>
              <Rocket className="h-4 w-4" /> Move to {NEXT_STATUS[tournament.status]!.replaceAll('_', ' ')}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categories &amp; Draws</TabsTrigger>
          <TabsTrigger value="registrations">Registrations</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <div className="grid grid-cols-1 gap-4">
            {categories.map((c) => (
              <Card key={c._id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {c.format.replaceAll('_', ' ')} · max {c.maxParticipants} · {c.status.replaceAll('_', ' ')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => generateDraw(c._id)}>
                      <Wand2 className="h-4 w-4" /> Generate draw
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/t/${tournament.slug}/bracket/${c._id}`} target="_blank" rel="noreferrer">
                        View bracket
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {categories.length === 0 && <p className="text-muted-foreground">No categories yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="registrations">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registrations ({registrations.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entrant</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrations.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell>{typeof r.player === 'object' ? r.player?.name : typeof r.team === 'object' ? r.team?.name : '—'}</TableCell>
                      <TableCell>{typeof r.category === 'object' ? r.category.name : ''}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => approveRegistration(r._id)}>
                              <ShieldCheck className="h-3.5 w-3.5" /> Approve
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => rejectRegistration(r._id)}>
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {registrations.length === 0 && <p className="py-6 text-center text-muted-foreground">No registrations yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {REPORTS.map((r) => (
              <Button key={r} variant="outline" onClick={() => downloadReport(r)} className="capitalize">
                <Download className="h-4 w-4" /> {r.replaceAll('-', ' ')}
              </Button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
