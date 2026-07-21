export type Role =
  | 'super_admin'
  | 'tournament_admin'
  | 'organizer'
  | 'club_admin'
  | 'academy_admin'
  | 'corporate_admin'
  | 'referee'
  | 'umpire'
  | 'volunteer'
  | 'player'
  | 'spectator'

export interface User {
  _id: string
  name: string
  email: string
  phone?: string
  role: Role
  avatarUrl?: string
  country?: string
  city?: string
}

export interface Sport {
  _id: string
  name: string
  slug: string
  iconUrl?: string
  isTeamCapable: boolean
  isDoublesCapable: boolean
}

export type TournamentType = 'public' | 'private' | 'club' | 'academy' | 'corporate' | 'national' | 'international'

export type TournamentFormat =
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin'
  | 'league'
  | 'swiss'
  | 'ladder_league'
  | 'box_league'
  | 'team_league'
  | 'team_knockout'
  | 'group_knockout'

export type TournamentStatus =
  | 'draft'
  | 'published'
  | 'registration_open'
  | 'registration_closed'
  | 'draw_published'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface Venue {
  _id: string
  name: string
  city: string
  country: string
  address: string
}

export interface Tournament {
  _id: string
  name: string
  slug: string
  description?: string
  sport: Sport | string
  type: TournamentType
  status: TournamentStatus
  bannerUrl?: string
  logoUrl?: string
  galleryUrls: string[]
  organizer: User | string
  venues: Venue[] | string[]
  primaryVenue?: Venue | string
  registrationOpenAt: string
  registrationCloseAt: string
  startDate: string
  endDate: string
  currency: string
  baseFee: number
  taxPercent: number
  gstPercent: number
  contact: { name?: string; email?: string; phone?: string }
  social: Record<string, string | undefined>
  registrationRules: {
    maxPlayers?: number
    minPlayers?: number
    waitlistEnabled: boolean
    wildcardSlots: number
    luckyLoserSlots: number
    lateEntryAllowed: boolean
    approvalMode: 'automatic' | 'manual'
    checkInRequired: boolean
    qrCheckIn: boolean
    digitalWaiverRequired: boolean
    medicalDeclarationRequired: boolean
    emergencyContactRequired: boolean
  }
  isPublished: boolean
  isFeatured: boolean
}

export interface TournamentCategory {
  _id: string
  tournament: string
  name: string
  isTeamEvent: boolean
  isDoubles: boolean
  ageGroup?: string
  gender: 'male' | 'female' | 'mixed' | 'open'
  skillLevel: string
  format: TournamentFormat
  formatConfig: Record<string, unknown>
  entryFee?: number
  currency?: string
  maxParticipants: number
  minParticipants: number
  seeding: { method: string; avoidSameClub: boolean; avoidSameCity: boolean; avoidSameCountry: boolean }
  prizes: { position: string; cashAmount?: number; currency?: string; description?: string }[]
  status: 'draft' | 'open' | 'closed' | 'draw_published' | 'in_progress' | 'completed'
}

export interface Registration {
  _id: string
  tournament: string
  category: string | TournamentCategory
  player?: User | string
  team?: { _id: string; name: string; logoUrl?: string } | string
  status: 'pending' | 'approved' | 'rejected' | 'waitlisted' | 'withdrawn' | 'checked_in'
  entryType: string
  seed?: number
  waitlistPosition?: number
  checkIn: { isCheckedIn: boolean; checkedInAt?: string; method?: string }
  registeredAt: string
}

export interface MatchSide {
  registration?: Registration | string
  team?: { _id: string; name: string; logoUrl?: string } | string
  label?: string
}

export interface SetScore {
  setNumber: number
  sideA: number
  sideB: number
}

export interface Match {
  _id: string
  tournament: string
  category: string
  round: string
  matchNumber: number
  stage: string
  bracketSide: 'winners' | 'losers' | 'grand_final' | 'none'
  groupId?: string
  sideA: MatchSide
  sideB: MatchSide
  status: 'scheduled' | 'ready' | 'in_progress' | 'suspended' | 'completed' | 'walkover' | 'retired' | 'defaulted' | 'cancelled'
  sets: SetScore[]
  winner?: 'sideA' | 'sideB'
  winReason?: string
  isBye: boolean
  scheduledAt?: string
  court?: { _id: string; name: string } | string
}

export interface Standing {
  _id: string
  category: string
  groupId?: string
  registration?: Registration | string
  team?: { _id: string; name: string } | string
  played: number
  won: number
  lost: number
  setsFor: number
  setsAgainst: number
  matchPoints: number
  rank: number
  form: ('W' | 'L' | 'D')[]
}
