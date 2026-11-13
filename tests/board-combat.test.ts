import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { latestAttack, layoutCombat, moveCombatant, pieceId } from '../src/lib/boardCombat.ts';

const pc = (ref_id: string, extra = {}) => ({ kind: 'pc' as const, ref_id, name: ref_id, initiative: 10, hp: 8, max_hp: 8, ac: 12, ...extra });
const enemy = (ref_id: string, extra = {}) => ({ kind: 'enemy' as const, ref_id, name: ref_id, initiative: 10, hp: 6, max_hp: 6, ac: 11, ...extra });
const at = '2026-11-12T12:00:00.000Z';
const combat = (combatants: ReturnType<typeof pc | typeof enemy>[], turn_index = 0) => ({
  id: 'c', world_id: 'w', adventure_id: null, active: true, round: 1, turn_index, combatants, log: [], created_at: at, updated_at: at,
});
const where = (pieces: ReturnType<typeof layoutCombat>) => Object.fromEntries(pieces.map((piece) => [piece.refId, `${piece.x},${piece.y}`]));

describe('Combate sobre el tablero', () => {
  it('forma héroes a la izquierda, enemigos a la derecha y ausentes al fondo', () => {
    const pieces = layoutCombat([pc('Iria'), enemy('Goblin'), pc('Bram', { away: true }), enemy('Lobo', { hp: 0 })], 1, 12, 7);
    assert.deepEqual(where(pieces), { Iria: '2,2', Goblin: '9,2', Bram: '0,4', Lobo: '9,4' });
    assert.deepEqual(pieces.map((piece) => [piece.turn, piece.away, piece.down]), [[false, false, false], [true, false, false], [false, true, false], [false, false, true]]);
    assert.equal(pieces[0].id, 'pc-Iria');
    assert.equal(pieceId(enemy('enemy-0')), 'enemy-c-enemy-0');
  });
  it('nunca pone dos fichas en la misma casilla, ni con tableros pequeños', () => {
    const many = [...Array.from({ length: 9 }, (_, index) => pc(`h${index}`)), ...Array.from({ length: 9 }, (_, index) => enemy(`e${index}`))];
    const cells = layoutCombat(many, 0, 8, 6).map((piece) => `${piece.x},${piece.y}`);
    assert.equal(cells.length, 18);
    assert.equal(new Set(cells).size, 18);
  });
  it('respeta la posición guardada y la ignora si no cabe o ya está ocupada', () => {
    const list = [pc('Iria', { pos: { x: 5, y: 5 } }), pc('Bram', { pos: { x: 5, y: 5 } }), enemy('Goblin', { pos: { x: 40, y: 1 } }), pc('Ana', { pos: { x: 6, y: 1 }, away: true })];
    const cells = where(layoutCombat(list, 0, 12, 7));
    assert.equal(cells.Iria, '5,5');
    assert.equal(cells.Bram, '2,3');
    assert.equal(cells.Goblin, '9,3');
    assert.equal(cells.Ana, '0,5');
  });
  it('mueve solo a casillas libres y nunca a quien está en la retaguardia', () => {
    const base = combat([pc('Iria'), enemy('Goblin'), pc('Bram', { away: true })]);
    const moved = moveCombatant(base, 'Iria', 6, 3, 12, 7);
    assert.deepEqual(moved?.combatants[0].pos, { x: 6, y: 3 });
    assert.equal(where(layoutCombat(moved!.combatants, 0, 12, 7)).Iria, '6,3');
    assert.equal(moveCombatant(base, 'Iria', 9, 3, 12, 7), null);
    assert.equal(moveCombatant(base, 'Iria', 12, 0, 12, 7), null);
    assert.equal(moveCombatant(base, 'Bram', 6, 3, 12, 7), null);
    assert.equal(moveCombatant(base, 'nadie', 6, 3, 12, 7), null);
  });
  it('solo anuncia el ataque que se guardó con este mismo estado', () => {
    const attack = { type: 'jth.attack.v1' as const, id: 'a', at, attacker: 'Iria', target: 'Goblin', attackerKind: 'pc' as const, hit: true, damage: 4, message: 'Iria golpea.' };
    const fresh = combat([pc('Iria', { last_attack: attack }), enemy('Goblin')]);
    assert.equal(latestAttack(fresh)?.id, 'a');
    assert.equal(latestAttack({ ...fresh, updated_at: '2026-11-12T12:00:05.000Z' }), null);
    assert.equal(latestAttack(combat([pc('Iria'), enemy('Goblin')])), null);
    assert.equal(latestAttack(null), null);
  });
});
