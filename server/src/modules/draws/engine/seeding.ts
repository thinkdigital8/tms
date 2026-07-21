import { SeedingMethod } from '../../../common/types/enums';
import { EngineParticipant } from './types';

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Standard recursive "seed order" for a single-elimination bracket of a
 * given size (power of two). Returns an array where index i (0-based draw
 * slot) holds the seed number that should occupy that slot, e.g. for size 8:
 * [1, 8, 5, 4, 3, 6, 7, 2].
 */
export function standardSeedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const doubled = order.length * 2;
    const next: number[] = [];
    for (const x of order) {
      next.push(x, doubled + 1 - x);
    }
    order = next;
  }
  return order;
}

/** Orders participants by seed method, assigning `seed` 1..N (best first). */
export function rankParticipants(
  participants: EngineParticipant[],
  method: SeedingMethod
): EngineParticipant[] {
  const list = [...participants];
  switch (method) {
    case SeedingMethod.RATING_BASED:
    case SeedingMethod.PREVIOUS_RESULTS:
    case SeedingMethod.FEDERATION_RANKING:
    case SeedingMethod.CLUB_RANKING:
    case SeedingMethod.CUSTOM:
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      break;
    case SeedingMethod.MANUAL:
      list.sort((a, b) => (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER));
      break;
    case SeedingMethod.RANDOM:
    case SeedingMethod.AUTOMATIC:
    default:
      shuffleInPlace(list);
      break;
  }
  return list.map((p, i) => ({ ...p, seed: p.seed ?? i + 1 }));
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export interface ProtectedSeedingOptions {
  avoidSameClub: boolean;
  avoidSameCity: boolean;
  avoidSameCountry: boolean;
}

/**
 * Places ranked participants into bracket slots 1..bracketSize using the
 * standard seed order, then applies a best-effort local-swap heuristic among
 * *unseeded* slots to reduce first-round collisions between participants who
 * share a club/city/country (protected seeding). Top seeds keep their
 * standard quadrant placement so seeding integrity is preserved; only
 * non-conflicting swaps within the unseeded pool are attempted, up to a
 * bounded number of passes — this is a heuristic, not an optimal solver.
 */
export function placeIntoBracket(
  ranked: EngineParticipant[],
  bracketSize: number,
  protectedOptions?: ProtectedSeedingOptions
): (EngineParticipant | undefined)[] {
  const order = standardSeedOrder(bracketSize); // slot index -> seed number
  const bySeed = new Map<number, EngineParticipant>();
  ranked.forEach((p, i) => bySeed.set(i + 1, p));

  const slots: (EngineParticipant | undefined)[] = order.map((seedNum) => bySeed.get(seedNum));

  if (protectedOptions && (protectedOptions.avoidSameClub || protectedOptions.avoidSameCity || protectedOptions.avoidSameCountry)) {
    applyProtectedSeedingSwaps(slots, ranked.length, protectedOptions);
  }

  return slots;
}

function conflicts(a: EngineParticipant, b: EngineParticipant, opts: ProtectedSeedingOptions): boolean {
  if (opts.avoidSameClub && a.clubId && b.clubId && a.clubId === b.clubId) return true;
  if (opts.avoidSameCity && a.city && b.city && a.city === b.city) return true;
  if (opts.avoidSameCountry && a.country && b.country && a.country === b.country) return true;
  return false;
}

function applyProtectedSeedingSwaps(
  slots: (EngineParticipant | undefined)[],
  seededCount: number,
  opts: ProtectedSeedingOptions
): void {
  const protectedTopSeeds = Math.min(seededCount, 8); // top seeds' quadrants stay fixed
  const maxPasses = 3;

  for (let pass = 0; pass < maxPasses; pass++) {
    let swapped = false;
    for (let i = 0; i < slots.length; i += 2) {
      const a = slots[i];
      const b = slots[i + 1];
      if (!a || !b) continue;
      if (!conflicts(a, b, opts)) continue;

      // find a swap candidate in another pair that resolves both conflicts
      for (let j = 0; j < slots.length; j += 2) {
        if (j === i) continue;
        const c = slots[j];
        const d = slots[j + 1];
        const candidateIdx = c && !conflicts(a, c, opts) ? j : d && !conflicts(a, d, opts) ? j + 1 : -1;
        if (candidateIdx === -1) continue;

        const candidate = slots[candidateIdx]!;
        if (candidate.seed && candidate.seed <= protectedTopSeeds) continue;
        if (b.seed && b.seed <= protectedTopSeeds) continue;

        // swap b (conflicting) with candidate
        slots[candidateIdx] = b;
        slots[i + 1] = candidate;
        swapped = true;
        break;
      }
      if (swapped) break;
    }
    if (!swapped) break;
  }
}
