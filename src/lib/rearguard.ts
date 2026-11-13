// La retaguardia: un jugador puede irse a mitad de combate sin frenar la mesa.
// Su personaje deja de actuar y nadie puede atacarlo hasta que vuelva.
// `away` vive dentro del JSON de combatientes, así que no cambia el esquema.
import type { Combatant, CombatRow } from './supabase';

/** Tiempo sin conexión antes de retirar al personaje de forma automática. */
export const ABSENCE_GRACE_MS = 90_000;

export type BattleOutcome = 'victory' | 'defeat' | 'retreat';

export function canAct(combatant: Combatant): boolean {
  return combatant.hp > 0 && !combatant.away;
}

export function playerKey(name: string | null | undefined): string {
  return (name ?? '').trim().toLocaleLowerCase('es');
}

/** Personajes a los que un enemigo puede atacar: en pie y en el frente. */
export function enemyTargets(combatants: Combatant[]): Combatant[] {
  return combatants.filter((item) => item.kind === 'pc' && canAct(item));
}

/** Siguiente combatiente que puede actuar, saltando caídos y ausentes. */
export function nextTurn(combatants: Combatant[], turnIndex: number, round: number): { turn_index: number; round: number } | null {
  const count = combatants.length;
  if (count === 0) return null;
  let index = ((turnIndex % count) + count) % count;
  let nextRound = round;
  for (let step = 0; step < count; step++) {
    index = (index + 1) % count;
    if (index === 0) nextRound++;
    if (canAct(combatants[index])) return { turn_index: index, round: nextRound };
  }
  return null;
}

/** Cómo termina la pelea, o null si debe continuar. */
export function battleOutcome(combatants: Combatant[]): BattleOutcome | null {
  if (!combatants.some((item) => item.kind === 'enemy' && item.hp > 0)) return 'victory';
  if (enemyTargets(combatants).length > 0) return null;
  // Nadie queda en el frente. Si alguien espera a salvo, el grupo se repliega.
  return combatants.some((item) => item.kind === 'pc' && item.away && item.hp > 0) ? 'retreat' : 'defeat';
}

/** Tras cualquier ataque confirmado, cierra una pelea resuelta o avanza la iniciativa. */
export function afterAttack(combat: CombatRow): { combat: CombatRow; outcome: BattleOutcome | null } {
  const outcome = battleOutcome(combat.combatants);
  if (outcome) return { combat: { ...combat, active: false }, outcome };
  const turn = nextTurn(combat.combatants, combat.turn_index, combat.round);
  if (!turn) return { combat: { ...combat, active: false }, outcome: 'defeat' };
  return { combat: { ...combat, ...turn }, outcome: null };
}

export function withdraw(combat: CombatRow, refId: string, automatic = false): CombatRow | null {
  const index = combat.combatants.findIndex((item) => item.ref_id === refId);
  const target = combat.combatants[index];
  if (!target || target.kind !== 'pc' || target.away) return null;
  const combatants = combat.combatants.map((item) => item.ref_id === refId ? { ...item, away: true } : item);
  const line = automatic
    ? `${target.name} perdió el contacto con la mesa y se repliega a la retaguardia. Nadie puede atacarle hasta que vuelva.`
    : `${target.name} se repliega a la retaguardia. Nadie puede atacarle hasta que vuelva.`;
  const next: CombatRow = { ...combat, combatants, log: [...combat.log, line] };
  if (combat.combatants.length && combat.turn_index % combat.combatants.length === index) {
    const turn = nextTurn(combatants, combat.turn_index, combat.round);
    if (turn) return { ...next, ...turn };
  }
  return next;
}

export function rejoin(combat: CombatRow, refId: string): CombatRow | null {
  const target = combat.combatants.find((item) => item.ref_id === refId);
  if (!target || target.kind !== 'pc' || !target.away) return null;
  const combatants = combat.combatants.map((item) => {
    if (item.ref_id !== refId) return item;
    const { away: _away, ...rest } = item;
    return rest;
  });
  const next: CombatRow = { ...combat, combatants, log: [...combat.log, `${target.name} vuelve al frente y actuará cuando llegue su turno.`] };
  // Si nadie podía actuar, el que vuelve toma el turno para no dejar la mesa parada.
  const current = combatants[combat.turn_index % combatants.length];
  if (current && !canAct(current)) {
    const turn = nextTurn(combatants, combat.turn_index, combat.round);
    if (turn) return { ...next, ...turn };
  }
  return next;
}

/**
 * Personajes en el frente cuyo jugador no está en la mesa.
 * Un personaje sin dueño conocido nunca se retira solo.
 */
export function absentCombatants(combatants: Combatant[], ownerById: Map<string, string | null | undefined>, presentNames: string[]): { refId: string; owner: string }[] {
  const present = new Set(presentNames.map(playerKey).filter(Boolean));
  return combatants.flatMap((item) => {
    if (item.kind !== 'pc' || item.away) return [];
    const owner = playerKey(ownerById.get(item.ref_id));
    return owner && !present.has(owner) ? [{ refId: item.ref_id, owner }] : [];
  });
}
