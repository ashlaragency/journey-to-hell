export interface CombatAttackEvent {
  type: 'jth.attack.v1';
  id: string;
  at: string;
  attacker: string;
  target: string;
  hit: boolean;
  damage: number;
  message: string;
  attackerKind: 'pc' | 'enemy';
}

export const COMBAT_EFFECT_EVENT = 'jth:combat-effect';
export const COMBAT_EFFECT_TTL = 8000;
export const COMBAT_EFFECT_DURATION = 1800;

const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;

export function parseCombatAttackEvent(value: unknown): CombatAttackEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const event = value as Record<string, unknown>;
  if (event.type !== 'jth.attack.v1' || !text(event.id, 100) || !text(event.at, 50)
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(event.at)
    || !Number.isFinite(Date.parse(event.at)) || new Date(event.at).toISOString() !== event.at
    || !text(event.attacker, 200) || !text(event.target, 200) || !text(event.message, 2000)
    || typeof event.hit !== 'boolean' || typeof event.damage !== 'number'
    || !Number.isSafeInteger(event.damage) || event.damage < 0 || event.damage > 100000
    || (!event.hit && event.damage !== 0) || (event.attackerKind !== 'pc' && event.attackerKind !== 'enemy')) return null;
  return {
    type: 'jth.attack.v1', id: event.id, at: event.at, attacker: event.attacker,
    target: event.target, hit: event.hit, damage: event.damage,
    message: event.message, attackerKind: event.attackerKind,
  };
}

export function combatLogText(entry: unknown): string {
  if (typeof entry === 'string') return entry;
  return parseCombatAttackEvent(entry)?.message ?? 'Un acontecimiento del combate.';
}

export function isFreshCombatEffect(event: CombatAttackEvent, now = Date.now()): boolean {
  const age = now - Date.parse(event.at);
  return age >= -1000 && age <= COMBAT_EFFECT_TTL;
}

// Only call once the attack and its log entry have been confirmed by the database.
export function publishLocalCombatEffect(event: CombatAttackEvent, worldId: string): void {
  if (typeof window === 'undefined' || !worldId || !parseCombatAttackEvent(event)) return;
  window.dispatchEvent(new CustomEvent(COMBAT_EFFECT_EVENT, { detail: { event, worldId } }));
}
