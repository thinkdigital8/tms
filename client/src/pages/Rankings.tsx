import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Sport } from '@/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface LeaderboardRow {
  playerId: string
  name: string
  country?: string
  avatarUrl?: string
  totalPoints: number
}

export default function Rankings() {
  const [sports, setSports] = useState<Sport[]>([])
  const [sport, setSport] = useState('')
  const [scope, setScope] = useState('national')
  const [rows, setRows] = useState<LeaderboardRow[]>([])

  useEffect(() => {
    api.get('/sports').then((res) => {
      setSports(res.data.data)
      if (res.data.data[0]) setSport(res.data.data[0]._id)
    })
  }, [])

  useEffect(() => {
    if (!sport) return
    api.get('/rankings', { params: { sport, scope } }).then((res) => setRows(res.data.data))
  }, [sport, scope])

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Rankings</h1>
      <p className="mt-1 text-muted-foreground">Player ranking points earned from tournament results.</p>

      <div className="my-6 flex flex-wrap gap-3">
        <Select value={sport} onValueChange={setSport}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sport" />
          </SelectTrigger>
          <SelectContent>
            {sports.map((s) => (
              <SelectItem key={s._id} value={s._id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="club">Club</SelectItem>
            <SelectItem value="national">National</SelectItem>
            <SelectItem value="international">International</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.playerId}>
                  <TableCell className="font-semibold">{i + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={r.avatarUrl} />
                        <AvatarFallback>{initials(r.name)}</AvatarFallback>
                      </Avatar>
                      {r.name}
                    </div>
                  </TableCell>
                  <TableCell>{r.country ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono">{r.totalPoints}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 && <p className="py-10 text-center text-muted-foreground">No ranking data yet.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
