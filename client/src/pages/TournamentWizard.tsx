import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from '@/store/toast'
import type { Sport, TournamentFormat, TournamentType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STEPS = ['Basics', 'Schedule & Fees', 'Registration Rules', 'Categories', 'Review']

const TOURNAMENT_TYPES: { value: TournamentType; label: string; hint: string }[] = [
  { value: 'public', label: 'Public', hint: 'Anyone can register' },
  { value: 'private', label: 'Private', hint: 'Invitation only, admin approves entries' },
  { value: 'club', label: 'Club', hint: 'Only club members can register' },
  { value: 'academy', label: 'Academy', hint: 'Restricted to academy students' },
  { value: 'corporate', label: 'Corporate', hint: 'Employees of selected companies' },
  { value: 'national', label: 'National', hint: 'Country-level, federation approval, national ranking points' },
  { value: 'international', label: 'International', hint: 'Multi-country, international rankings, multi-currency' },
]

const FORMATS: { value: TournamentFormat; label: string }[] = [
  { value: 'single_elimination', label: 'Single Elimination' },
  { value: 'double_elimination', label: 'Double Elimination' },
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'league', label: 'League' },
  { value: 'swiss', label: 'Swiss System' },
  { value: 'ladder_league', label: 'Ladder League' },
  { value: 'box_league', label: 'Box League' },
  { value: 'team_league', label: 'Team League' },
  { value: 'team_knockout', label: 'Team Knockout' },
  { value: 'group_knockout', label: 'Group Stage + Knockout' },
]

interface CategoryDraft {
  name: string
  gender: 'male' | 'female' | 'mixed' | 'open'
  ageGroup: string
  skillLevel: string
  format: TournamentFormat
  maxParticipants: number
  entryFee: number
  isTeamEvent: boolean
}

export default function TournamentWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [sports, setSports] = useState<Sport[]>([])
  const [saving, setSaving] = useState(false)

  const [basics, setBasics] = useState({ name: '', description: '', sport: '', type: 'public' as TournamentType })
  const [schedule, setSchedule] = useState({
    registrationOpenAt: '',
    registrationCloseAt: '',
    startDate: '',
    endDate: '',
    currency: 'USD',
    baseFee: 0,
    taxPercent: 0,
    gstPercent: 0,
  })
  const [rules, setRules] = useState({
    approvalMode: 'automatic' as 'automatic' | 'manual',
    waitlistEnabled: true,
    wildcardSlots: 0,
    lateEntryAllowed: false,
    checkInRequired: true,
    qrCheckIn: true,
    digitalWaiverRequired: false,
    medicalDeclarationRequired: false,
  })
  const [categories, setCategories] = useState<CategoryDraft[]>([
    { name: "Men's Singles", gender: 'male', ageGroup: 'Open', skillLevel: 'open', format: 'single_elimination', maxParticipants: 32, entryFee: 0, isTeamEvent: false },
  ])

  useEffect(() => {
    api.get('/sports').then((res) => setSports(res.data.data))
  }, [])

  function addCategory() {
    setCategories((c) => [
      ...c,
      { name: '', gender: 'open', ageGroup: 'Open', skillLevel: 'open', format: 'single_elimination', maxParticipants: 16, entryFee: 0, isTeamEvent: false },
    ])
  }
  function updateCategory(idx: number, patch: Partial<CategoryDraft>) {
    setCategories((c) => c.map((cat, i) => (i === idx ? { ...cat, ...patch } : cat)))
  }
  function removeCategory(idx: number) {
    setCategories((c) => c.filter((_, i) => i !== idx))
  }

  const canProceed = () => {
    if (step === 0) return basics.name.trim().length >= 3 && !!basics.sport
    if (step === 1) return !!schedule.registrationOpenAt && !!schedule.registrationCloseAt && !!schedule.startDate && !!schedule.endDate
    if (step === 3) return categories.length > 0 && categories.every((c) => c.name.trim().length > 0)
    return true
  }

  async function handlePublish() {
    setSaving(true)
    try {
      const { data } = await api.post('/tournaments', {
        name: basics.name,
        description: basics.description,
        sport: basics.sport,
        type: basics.type,
        registrationOpenAt: schedule.registrationOpenAt,
        registrationCloseAt: schedule.registrationCloseAt,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        currency: schedule.currency,
        baseFee: schedule.baseFee,
        taxPercent: schedule.taxPercent,
        gstPercent: schedule.gstPercent,
        registrationRules: rules,
      })
      const tournamentId = data.data._id

      await Promise.all(
        categories.map((cat) =>
          api.post(`/tournaments/${tournamentId}/categories`, {
            name: cat.name,
            gender: cat.gender,
            ageGroup: cat.ageGroup,
            skillLevel: cat.skillLevel,
            format: cat.format,
            maxParticipants: cat.maxParticipants,
            entryFee: cat.entryFee,
            isTeamEvent: cat.isTeamEvent,
            seeding: { method: 'rating_based', avoidSameClub: false, avoidSameCity: false, avoidSameCountry: false },
          })
        )
      )

      toast({ title: 'Tournament created', description: 'Saved as draft — publish it when ready.', variant: 'success' })
      navigate(`/tournaments/${tournamentId}/manage`)
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create tournament'
      toast({ title: 'Something went wrong', description: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Create a Tournament</h1>
      <p className="mt-1 text-muted-foreground">A guided setup covering everything organizers need.</p>

      <div className="my-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                i < step && 'border-primary bg-primary text-primary-foreground',
                i === step && 'border-primary text-primary',
                i > step && 'border-border text-muted-foreground'
              )}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn('hidden text-sm sm:block', i === step ? 'font-medium text-foreground' : 'text-muted-foreground')}>{label}</span>
            {i < STEPS.length - 1 && <div className={cn('h-px flex-1', i < step ? 'bg-primary' : 'bg-border')} />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Tournament name</Label>
                <Input id="name" value={basics.name} onChange={(e) => setBasics((b) => ({ ...b, name: e.target.value }))} placeholder="City Open Pickleball Championship" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={basics.description} onChange={(e) => setBasics((b) => ({ ...b, description: e.target.value }))} rows={4} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Sport</Label>
                <Select value={basics.sport} onValueChange={(v) => setBasics((b) => ({ ...b, sport: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sport" />
                  </SelectTrigger>
                  <SelectContent>
                    {sports.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Tournament type</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {TOURNAMENT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setBasics((b) => ({ ...b, type: t.value }))}
                      className={cn(
                        'rounded-lg border p-3 text-left text-sm transition-colors',
                        basics.type === t.value ? 'border-primary bg-accent' : 'border-border hover:bg-muted'
                      )}
                    >
                      <p className="font-medium">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.hint}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Registration opens</Label>
                  <Input type="datetime-local" value={schedule.registrationOpenAt} onChange={(e) => setSchedule((s) => ({ ...s, registrationOpenAt: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Registration closes</Label>
                  <Input type="datetime-local" value={schedule.registrationCloseAt} onChange={(e) => setSchedule((s) => ({ ...s, registrationCloseAt: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Tournament start date</Label>
                  <Input type="date" value={schedule.startDate} onChange={(e) => setSchedule((s) => ({ ...s, startDate: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Tournament end date</Label>
                  <Input type="date" value={schedule.endDate} onChange={(e) => setSchedule((s) => ({ ...s, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Currency</Label>
                  <Input value={schedule.currency} onChange={(e) => setSchedule((s) => ({ ...s, currency: e.target.value.toUpperCase() }))} maxLength={3} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Base fee</Label>
                  <Input type="number" min={0} value={schedule.baseFee} onChange={(e) => setSchedule((s) => ({ ...s, baseFee: Number(e.target.value) }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Tax %</Label>
                  <Input type="number" min={0} value={schedule.taxPercent} onChange={(e) => setSchedule((s) => ({ ...s, taxPercent: Number(e.target.value) }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>GST %</Label>
                  <Input type="number" min={0} value={schedule.gstPercent} onChange={(e) => setSchedule((s) => ({ ...s, gstPercent: Number(e.target.value) }))} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label>Entry approval</Label>
                <Select value={rules.approvalMode} onValueChange={(v) => setRules((r) => ({ ...r, approvalMode: v as 'automatic' | 'manual' }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automatic">Automatic approval</SelectItem>
                    <SelectItem value="manual">Manual approval</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Wildcard slots</Label>
                <Input type="number" min={0} value={rules.wildcardSlots} onChange={(e) => setRules((r) => ({ ...r, wildcardSlots: Number(e.target.value) }))} className="max-w-32" />
              </div>
              {[
                ['waitlistEnabled', 'Enable waitlist when categories fill up'],
                ['lateEntryAllowed', 'Allow late entries after registration closes'],
                ['checkInRequired', 'Require player check-in'],
                ['qrCheckIn', 'Enable QR-code check-in'],
                ['digitalWaiverRequired', 'Require digital waiver signature'],
                ['medicalDeclarationRequired', 'Require medical declaration'],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm">{label}</span>
                  <Switch
                    checked={rules[key as keyof typeof rules] as boolean}
                    onCheckedChange={(v) => setRules((r) => ({ ...r, [key]: v }))}
                  />
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              {categories.map((cat, idx) => (
                <div key={idx} className="rounded-lg border border-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium">Category {idx + 1}</span>
                    {categories.length > 1 && (
                      <button onClick={() => removeCategory(idx)} className="text-xs text-destructive hover:underline">
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label>Name</Label>
                      <Input value={cat.name} onChange={(e) => updateCategory(idx, { name: e.target.value })} placeholder="Men's Doubles" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Age group</Label>
                      <Input value={cat.ageGroup} onChange={(e) => updateCategory(idx, { ageGroup: e.target.value })} placeholder="Open, U18, 35+…" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Gender</Label>
                      <Select value={cat.gender} onValueChange={(v) => updateCategory(idx, { gender: v as CategoryDraft['gender'] })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                          <SelectItem value="open">Open</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Skill level</Label>
                      <Select value={cat.skillLevel} onValueChange={(v) => updateCategory(idx, { skillLevel: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="rating_based">Rating based</SelectItem>
                          <SelectItem value="open">Open</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Format</Label>
                      <Select value={cat.format} onValueChange={(v) => updateCategory(idx, { format: v as TournamentFormat })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FORMATS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Max participants</Label>
                      <Input type="number" min={2} value={cat.maxParticipants} onChange={(e) => updateCategory(idx, { maxParticipants: Number(e.target.value) })} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Entry fee</Label>
                      <Input type="number" min={0} value={cat.entryFee} onChange={(e) => updateCategory(idx, { entryFee: Number(e.target.value) })} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <span className="text-sm">Team event</span>
                      <Switch checked={cat.isTeamEvent} onCheckedChange={(v) => updateCategory(idx, { isTeamEvent: v })} />
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addCategory} className="self-start">
                + Add another category
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="font-semibold">{basics.name || 'Untitled tournament'}</h3>
                <p className="text-sm text-muted-foreground">{basics.description}</p>
                <div className="mt-2 flex gap-2">
                  <Badge>{TOURNAMENT_TYPES.find((t) => t.value === basics.type)?.label}</Badge>
                  <Badge variant="secondary">{sports.find((s) => s._id === basics.sport)?.name ?? 'Sport'}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Registration window</p>
                  <p>{schedule.registrationOpenAt || '—'} → {schedule.registrationCloseAt || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tournament dates</p>
                  <p>{schedule.startDate || '—'} → {schedule.endDate || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Base fee</p>
                  <p>{schedule.currency} {schedule.baseFee} (+{schedule.taxPercent}% tax, +{schedule.gstPercent}% GST)</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Approval mode</p>
                  <p className="capitalize">{rules.approvalMode}</p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Categories ({categories.length})</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c, i) => (
                    <Badge key={i} variant="outline">
                      {c.name || 'Unnamed'} · {c.maxParticipants} max
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                The tournament will be created as a <strong>draft</strong>. You can publish it and open registration from the manage page once you've reviewed everything.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={!canProceed()}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handlePublish} disabled={saving}>
            {saving ? 'Creating…' : 'Create Tournament'}
          </Button>
        )}
      </div>
    </div>
  )
}
