/**
 * Global RBAC role set. Roles are intentionally coarse; fine-grained access
 * within a tournament (e.g. "organizer of tournament X") is layered on top
 * via TournamentStaff assignments (see modules/staff) checked in
 * common/middleware/rbac.ts#requireTournamentRole.
 */
export enum Role {
  SUPER_ADMIN = 'super_admin',
  TOURNAMENT_ADMIN = 'tournament_admin',
  ORGANIZER = 'organizer',
  CLUB_ADMIN = 'club_admin',
  ACADEMY_ADMIN = 'academy_admin',
  CORPORATE_ADMIN = 'corporate_admin',
  REFEREE = 'referee',
  UMPIRE = 'umpire',
  VOLUNTEER = 'volunteer',
  PLAYER = 'player',
  SPECTATOR = 'spectator',
}

export const ALL_ROLES = Object.values(Role);

/** Roles that can manage platform-wide configuration (sports, federations). */
export const PLATFORM_ADMIN_ROLES = [Role.SUPER_ADMIN];

/** Roles that can generally administer a tournament they own/staff. */
export const TOURNAMENT_MANAGING_ROLES = [
  Role.SUPER_ADMIN,
  Role.TOURNAMENT_ADMIN,
  Role.ORGANIZER,
  Role.CLUB_ADMIN,
  Role.ACADEMY_ADMIN,
  Role.CORPORATE_ADMIN,
];

/** Roles allowed to submit / update match scores. */
export const SCORING_ROLES = [
  Role.SUPER_ADMIN,
  Role.TOURNAMENT_ADMIN,
  Role.ORGANIZER,
  Role.REFEREE,
  Role.UMPIRE,
];

/**
 * Per-tournament roles, distinct from the global Role above. A user may be
 * "player" globally but "organizer" for a specific tournament they were
 * granted staff access to.
 */
export enum TournamentStaffRole {
  OWNER = 'owner',
  ORGANIZER = 'organizer',
  REFEREE = 'referee',
  UMPIRE = 'umpire',
  VOLUNTEER = 'volunteer',
  SCOREKEEPER = 'scorekeeper',
}
