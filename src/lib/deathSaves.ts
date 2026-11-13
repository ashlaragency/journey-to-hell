export interface DeathSaves {
  successes: number;
  failures: number;
}

export const EMPTY_DEATH_SAVES: DeathSaves = { successes: 0, failures: 0 };

const MARKER = /<!--jth-death:v1:(\d+):(\d+)-->/;
const ALL_MARKERS = /\n?<!--jth-death:v1:\d+:\d+-->/g;

function validCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(3, Math.trunc(value))) : 0;
}

export function readDeathSaves(notes?: string | null): DeathSaves {
  const match = notes?.match(MARKER);
  if (!match) return { ...EMPTY_DEATH_SAVES };
  const successes = Number(match[1]);
  const failures = Number(match[2]);
  if (!Number.isInteger(successes) || !Number.isInteger(failures) || successes > 3 || failures > 3) {
    return { ...EMPTY_DEATH_SAVES };
  }
  return { successes, failures };
}

/** Store shared counters in notes without touching appearance or narrative text. */
export function writeDeathSaves(notes: string | null | undefined, saves: DeathSaves): string {
  const cleanNotes = (notes ?? '').replace(ALL_MARKERS, '').trim();
  const marker = `<!--jth-death:v1:${validCount(saves.successes)}:${validCount(saves.failures)}-->`;
  return cleanNotes ? `${cleanNotes}\n${marker}` : marker;
}

/** Remove only the death-save marker, retaining the rest of the character notes. */
export function clearDeathSaves(notes?: string | null): string | null {
  if (notes == null || !MARKER.test(notes)) return notes ?? null;
  const cleanNotes = notes.replace(ALL_MARKERS, '').trim();
  return cleanNotes || null;
}

export function resolveDeathSave(saves: DeathSaves, roll: number): { saves: DeathSaves; recovered: boolean } {
  if (roll === 20) return { saves: { ...EMPTY_DEATH_SAVES }, recovered: true };
  if (!Number.isFinite(roll) || roll < 1 || roll > 20) {
    return { saves: { successes: validCount(saves.successes), failures: validCount(saves.failures) }, recovered: false };
  }
  if (roll === 1) return { saves: { successes: validCount(saves.successes), failures: validCount(saves.failures + 2) }, recovered: false };
  if (roll >= 10) return { saves: { successes: validCount(saves.successes + 1), failures: validCount(saves.failures) }, recovered: false };
  return { saves: { successes: validCount(saves.successes), failures: validCount(saves.failures + 1) }, recovered: false };
}
