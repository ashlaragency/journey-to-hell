import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { absentCombatants, battleOutcome, enemyTargets, nextTurn, rejoin, withdraw } from '../src/lib/rearguard.ts';

const pc = (ref_id: string, extra = {}) => ({ kind: 'pc' as const, ref_id, name: ref_id, initiative: 10, hp: 8, max_hp: 8, ac: 12, ...extra });
const enemy = (ref_id: string, extra = {}) => ({ kind: 'enemy' as const, ref_id, name: ref_id, initiative: 10, hp: 6, max_hp: 6, ac: 11, ...extra });
const combat = (combatants: ReturnType<typeof pc | typeof enemy>[], turn_index = 0) => ({
  id: 'c', world_id: 'w', adventure_id: null, active: true, round: 1, turn_index, combatants, log: ['Empieza.'],
  created_at: '2026-11-12T12:00:00.000Z', updated_at: '2026-11-12T12:00:00.000Z',
});

describe('Retaguardia', () => {
  it('retira al personaje, lo protege y la mesa sigue', () => {
    const next = withdraw(combat([pc('Iria'), enemy('Goblin'), pc('Bram')], 1), 'Iria');
    assert.ok(next);
    assert.equal(next.combatants[0].away, true);
    assert.equal(next.turn_index, 1);
    assert.deepEqual(enemyTargets(next.combatants).map((item) => item.name), ['Bram']);
    assert.match(next.log.at(-1) ?? '', /Iria se repliega/);
  });
  it('pasa el turno si quien se va tenía el turno', () => {
    const next = withdraw(combat([pc('Iria'), enemy('Goblin'), pc('Bram')], 0), 'Iria', true);
    assert.equal(next?.turn_index, 1);
    assert.equal(next?.round, 1);
    assert.match(next?.log.at(-1) ?? '', /perdió el contacto/);
  });
  it('salta ausentes y caídos y cuenta la ronda al dar la vuelta', () => {
    const list = [pc('Iria'), enemy('Goblin', { hp: 0 }), pc('Bram', { away: true }), enemy('Lobo')];
    assert.deepEqual(nextTurn(list, 0, 1), { turn_index: 3, round: 1 });
    assert.deepEqual(nextTurn(list, 3, 1), { turn_index: 0, round: 2 });
    assert.equal(nextTurn([pc('Iria', { away: true })], 0, 1), null);
  });
  it('no retira dos veces ni a enemigos', () => {
    const base = combat([pc('Iria', { away: true }), enemy('Goblin')]);
    assert.equal(withdraw(base, 'Iria'), null);
    assert.equal(withdraw(base, 'Goblin'), null);
    assert.equal(withdraw(base, 'nadie'), null);
  });
  it('devuelve al personaje al frente sin cambiar el turno en curso', () => {
    const next = rejoin(combat([pc('Iria', { away: true }), enemy('Goblin'), pc('Bram')], 1), 'Iria');
    assert.ok(next);
    assert.equal('away' in next.combatants[0], false);
    assert.equal(next.turn_index, 1);
    assert.equal(rejoin(next, 'Iria'), null);
  });
  it('quien vuelve toma el turno si el actual no puede actuar', () => {
    const next = rejoin(combat([pc('Iria', { away: true }), enemy('Goblin', { hp: 0 }), pc('Bram', { hp: 0 })], 1), 'Iria');
    assert.equal(next?.turn_index, 0);
    assert.equal(next?.round, 2);
  });
  it('distingue victoria, derrota y repliegue', () => {
    assert.equal(battleOutcome([pc('Iria'), enemy('Goblin')]), null);
    assert.equal(battleOutcome([pc('Iria'), enemy('Goblin', { hp: 0 })]), 'victory');
    assert.equal(battleOutcome([pc('Iria', { hp: 0 }), enemy('Goblin')]), 'defeat');
    assert.equal(battleOutcome([pc('Iria', { hp: 0 }), pc('Bram', { away: true }), enemy('Goblin')]), 'retreat');
    assert.equal(battleOutcome([pc('Iria', { hp: 0 }), pc('Bram', { away: true, hp: 0 }), enemy('Goblin')]), 'defeat');
  });
  it('solo señala personajes con dueño conocido que no está en la mesa', () => {
    const list = [pc('a'), pc('b'), pc('c'), pc('d', { away: true }), enemy('e')];
    const owners = new Map<string, string | null>([['a', 'Pedro'], ['b', ' ana '], ['c', null], ['d', 'Luis']]);
    assert.deepEqual(absentCombatants(list, owners, ['PEDRO']), [{ refId: 'b', owner: 'ana' }]);
    assert.deepEqual(absentCombatants(list, owners, ['pedro', 'Ana']), []);
  });
});
