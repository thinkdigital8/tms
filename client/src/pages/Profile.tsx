import { useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { toast } from '@/store/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/lib/utils'

export default function Profile() {
  const { user, setUser } = useAuthStore()
  const [form, setForm] = useState({ name: user?.name ?? '', phone: user?.phone ?? '', city: user?.city ?? '', country: user?.country ?? '' })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const { data } = await api.patch('/users/me', form)
      setUser(data.data)
      toast({ title: 'Profile updated', variant: 'success' })
    } catch {
      toast({ title: 'Could not update profile', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback className="text-lg">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{user.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs capitalize text-muted-foreground">{user.role.replaceAll('_', ' ')}</p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Country</Label>
              <Input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
            </div>
          </div>
          <Button onClick={save} disabled={saving} className="self-start">
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
