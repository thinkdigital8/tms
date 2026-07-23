import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, MapPin, Search, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import type { Organization, OrgType } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  club: 'Clubs',
  academy: 'Academies',
  company: 'Companies',
  federation: 'Federations',
}

export default function ClubsList() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [orgType, setOrgType] = useState<OrgType>('club')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    api
      .get('/organizations', { params: { q: q || undefined, orgType, limit: 30 }, signal: controller.signal })
      .then((res) => setOrgs(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [q, orgType])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clubs &amp; Organizations</h1>
          <p className="mt-1 text-muted-foreground">Browse clubs, academies and companies running tournaments on TMS.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Select value={orgType} onValueChange={(v) => setOrgType(v as OrgType)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ORG_TYPE_LABELS) as OrgType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {ORG_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : orgs.length === 0 ? (
        <p className="py-20 text-center text-muted-foreground">No {ORG_TYPE_LABELS[orgType].toLowerCase()} found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((o) => (
            <Link key={o._id} to={`/clubs/${o._id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex items-start gap-3 pt-5">
                  {o.logoUrl ? (
                    <img src={o.logoUrl} alt={o.name} className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate font-semibold">{o.name}</h3>
                      {o.isVerified && <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />}
                    </div>
                    {(o.city || o.country) && (
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {[o.city, o.country].filter(Boolean).join(', ')}
                      </div>
                    )}
                    <Badge variant="outline" className="mt-2 capitalize">
                      {o.orgType}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
