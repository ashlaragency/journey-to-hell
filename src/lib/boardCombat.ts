// El combate sobre el tablero: cada combatiente es una ficha.
// Los héroes forman a la izquierda, los enemigos a la derecha y quien está
// en la retaguardia espera en la columna del fondo. La posición guardada
// (`pos`) viaja con el combate, así que toda la mesa ve los mismos movimientos.
import { parseCombatAttackEvent, type CombatAttackEvent } from './combatEffects.ts';
import type { Combatant, CombatRow } from './supabase';

export interface BoardPiece {
  /** Id de ficha: `pc-<personaje>` o `enemy-c-<ref>`. */
  id: string;
  refId: string;
  kind: 'pc' | 'enemy';
  name: string;
  x: number;
  y: number;
  hp: number;
  max_hp: number;
  away: boolean;
  down: boolean;
  turn: boolean;
}

export function pieceId(combatant: Pick<Combatant, 'kind' | 'ref_id'>): string {
  return combatant.kind === 'pc' ? `pc-${combatant.ref_id}` : `enemy-c-${combatant.ref_id}`;
}

const inside = (value: unknown, limit: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < limit;

/** Coloca cada combatiente en una casilla, sin repetir ninguna. */
export function layoutCombat(combatants: Combatant[], turnIndex: number, cols: number, rows: number): BoardPiece[] {
  const taken = new Set<string>();
  const cells = new Map<string, { x: number; y: number }>();
  const claim = (x: number, y: number) => {
    // Busca la casilla libre más cercana bajando por la columna y después por el resto del tablero.
    for (let step = 0; step < cols * rows; step++) {
      const index = (x * rows + y + step) % (cols * rows);
      const cell = { x: Math.floor(index / rows), y: index % rows };
      if (!taken.has(`${cell.x},${cell.y}`)) { taken.add(`${cell.x},${cell.y}`); return cell; }
    }
    return null;
  };
  // Primero, quien ya tiene un sitio elegido en el frente.
  for (const item of combatants) {
    if (item.away || !item.pos || !inside(item.pos.x, cols) || !inside(item.pos.y, rows) || taken.has(`${item.pos.x},${item.pos.y}`)) continue;
    taken.add(`${item.pos.x},${item.pos.y}`);
    cells.set(item.ref_id, { x: item.pos.x, y: item.pos.y });
  }
  // Cada bando tiene filas fijas: irse a la retaguardia o volver no descoloca al resto.
  const column = (group: Combatant[], xFor: (item: Combatant) => number) => {
    const gap = group.length * 2 - 1 <= rows ? 2 : 1;
    const top = Math.max(0, Math.floor((rows - ((group.length - 1) * gap + 1)) / 2));
    group.forEach((item, index) => {
      if (cells.has(item.ref_id)) return;
      const cell = claim(xFor(item), Math.min(rows - 1, top + index * gap));
      if (cell) cells.set(item.ref_id, cell);
    });
  };
  column(combatants.filter((item) => item.kind === 'pc'), (item) => item.away ? 0 : Math.min(cols - 1, 2));
  column(combatants.filter((item) => item.kind === 'enemy'), () => Math.max(0, cols - 3));
  const current = combatants.length ? ((turnIndex % combatants.length) + combatants.length) % combatants.length : -1;
  return combatants.flatMap((item, index) => {
    const cell = cells.get(item.ref_id);
    return cell ? [{
      id: pieceId(item), refId: item.ref_id, kind: item.kind, name: item.name, ...cell,
      hp: Math.max(0, item.hp), max_hp: item.max_hp, away: !!item.away, down: item.hp <= 0, turn: index === current,
    }] : [];
  });
}

/** Mueve una ficha del frente a una casilla libre. Devuelve null si no se puede. */
export function moveCombatant(combat: CombatRow, refId: string, x: number, y: number, cols: number, rows: number): CombatRow | null {
  if (!inside(x, cols) || !inside(y, rows)) return null;
  const pieces = layoutCombat(combat.combatants, combat.turn_index, cols, rows);
  const piece = pieces.find((item) => item.refId === refId);
  if (!piece || piece.away || pieces.some((item) => item.x === x && item.y === y)) return null;
  return { ...combat, combatants: combat.combatants.map((item) => item.ref_id === refId ? { ...item, pos: { x, y } } : item) };
}

/** El ataque que se acaba de guardar con este estado del combate, si lo hay. */
export function latestAttack(combat: Pick<CombatRow, 'combatants' | 'updated_at'> | null): CombatAttackEvent | null {
  if (!combat) return null;
  const updatedAt = Date.parse(combat.updated_at);
  for (const item of combat.combatants) {
    const event = parseCombatAttackEvent(item.last_attack);
    if (event && event.attacker === item.name && Date.parse(event.at) === updatedAt) return event;
  }
  return null;
}

/** Tamaño del tablero de combate: 12 × 7 encaja con las ilustraciones 16:9. */
export const COMBAT_COLS = 12;
export const COMBAT_ROWS = 7;
