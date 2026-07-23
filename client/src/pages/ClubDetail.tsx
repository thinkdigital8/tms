import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Building2, Globe, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import type { Organization } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function ClubDetail() {
  const { id } = useParams()
  const [org, setOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api
      .get(`/organizations/${id}`)
      .then((res) => setOrg(res.data.data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">Loading…</div>
  if (!org) return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">Not found.</div>

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-start gap-4">
        {org.logoUrl ? (
          <img src={org.logoUrl} alt={org.name} className="h-16 w-16 rounded-xl object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Building2 className="h-7 w-7 text-muted-foreground" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{org.name}</h1>
            {org.isVerified && <ShieldCheck className="h-5 w-5 text-primary" aria-label="Verified" />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {org.orgType}
            </Badge>
            {org.isNationalFederation && <Badge variant="secondary">National Federation</Badge>}
          </div>
          {(org.city || org.country) && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {[org.address, org.city, org.country].filter(Boolean).join(', ')}
            </div>
          )}
        </div>
      </div>

      {org.description && (
        <Card className="mb-6">
          <CardContent className="pt-5">
            <p className="whitespace-pre-line text-sm text-muted-foreground">{org.description}</p>
          </CardContent>
        </Card>
      )}

      {(org.contactEmail || org.contactPhone || org.website) && (
        <Card>
          <CardContent className="flex flex-col gap-2 pt-5 text-sm">
            {org.contactEmail && (
              <a href={`mailto:${org.contactEmail}`} className="flex items-center gap-2 text-primary hover:underline">
                <Mail className="h-4 w-4" /> {org.contactEmail}
              </a>
            )}
            {org.contactPhone && (
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> {org.contactPhone}
              </span>
            )}
            {org.website && (
              <a href={org.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                <Globe className="h-4 w-4" /> Website
              </a>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
