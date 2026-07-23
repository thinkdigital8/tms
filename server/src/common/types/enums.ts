export enum TournamentType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  CLUB = 'club',
  ACADEMY = 'academy',
  CORPORATE = 'corporate',
  NATIONAL = 'national',
  INTERNATIONAL = 'international',
}

export enum TournamentFormat {
  SINGLE_ELIMINATION = 'single_elimination',
  DOUBLE_ELIMINATION = 'double_elimination',
  ROUND_ROBIN = 'round_robin',
  LEAGUE = 'league',
  SWISS = 'swiss',
  LADDER_LEAGUE = 'ladder_league',
  BOX_LEAGUE = 'box_league',
  TEAM_LEAGUE = 'team_league',
  TEAM_KNOCKOUT = 'team_knockout',
  GROUP_KNOCKOUT = 'group_knockout',
}

export enum TournamentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  REGISTRATION_OPEN = 'registration_open',
  REGISTRATION_CLOSED = 'registration_closed',
  DRAW_PUBLISHED = 'draw_published',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum GenderCategory {
  MALE = 'male',
  FEMALE = 'female',
  MIXED = 'mixed',
  OPEN = 'open',
}

export enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  PROFESSIONAL = 'professional',
  RATING_BASED = 'rating_based',
  OPEN = 'open',
}

export enum SeedingMethod {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
  RANDOM = 'random',
  RATING_BASED = 'rating_based',
  PREVIOUS_RESULTS = 'previous_results',
  FEDERATION_RANKING = 'federation_ranking',
  CLUB_RANKING = 'club_ranking',
  CUSTOM = 'custom',
}

export enum RegistrationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WAITLISTED = 'waitlisted',
  WITHDRAWN = 'withdrawn',
  CHECKED_IN = 'checked_in',
}

export enum RegistrationEntryType {
  DIRECT = 'direct',
  WILDCARD = 'wildcard',
  LUCKY_LOSER = 'lucky_loser',
  LATE_ENTRY = 'late_entry',
  WAITLIST_PROMOTED = 'waitlist_promoted',
}

export enum MatchStatus {
  SCHEDULED = 'scheduled',
  READY = 'ready',
  IN_PROGRESS = 'in_progress',
  SUSPENDED = 'suspended',
  COMPLETED = 'completed',
  WALKOVER = 'walkover',
  RETIRED = 'retired',
  DEFAULTED = 'defaulted',
  CANCELLED = 'cancelled',
}

export enum MatchStage {
  GROUP = 'group',
  KNOCKOUT = 'knockout',
  ROUND_ROBIN = 'round_robin',
  SWISS = 'swiss',
  LADDER = 'ladder',
  BOX_LEAGUE = 'box_league',
  LEAGUE = 'league',
}

export enum BracketSide {
  WINNERS = 'winners',
  LOSERS = 'losers',
  GRAND_FINAL = 'grand_final',
  NONE = 'none',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  WAIVED = 'waived',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WHATSAPP = 'whatsapp',
  IN_APP = 'in_app',
}

export enum NotificationType {
  REGISTRATION_APPROVED = 'registration_approved',
  REGISTRATION_REJECTED = 'registration_rejected',
  UPCOMING_MATCH = 'upcoming_match',
  COURT_CHANGE = 'court_change',
  SCHEDULE_CHANGE = 'schedule_change',
  MATCH_RESULT = 'match_result',
  TOURNAMENT_UPDATE = 'tournament_update',
  PRIZE_DISTRIBUTION = 'prize_distribution',
  PAYMENT_RECEIPT = 'payment_receipt',
  WAITLIST_PROMOTED = 'waitlist_promoted',
}

export enum SponsorTier {
  TITLE = 'title',
  PLATINUM = 'platinum',
  GOLD = 'gold',
  SILVER = 'silver',
  BRONZE = 'bronze',
  PARTNER = 'partner',
}
