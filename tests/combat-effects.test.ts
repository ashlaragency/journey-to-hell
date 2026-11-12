import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { combatLogText, isFreshCombatEffect, parseCombatAttackEvent } from '../src/lib/combatEffects.ts';

const attack = {
  type: 'jth.attack.v1' as const, id: 'attack-a', at: '2026-11-12T12:00:00.000Z',
  attacker: 'Iria', target: 'Goblin', attackerKind: 'pc' as const,
  hit: true, damage: 4, message: 'Iria alcanza al goblin y causa 4 de daño.',
};

describe('Efectos de ataque compartidos', () => {
  it('conserva el resultado exacto del ataque que se guardó', () => {
    assert.deepEqual(parseCombatAttackEvent(attack), attack);
    assert.equal(parseCombatAttackEvent({ ...attack, hit: false, damage: 0 })?.hit, false);
  });
  it('descarta efectos corruptos antes de reproducir sonido o animación', () => {
    for (const change of [{ damage: -1 }, { damage: 1.5 }, { hit: false, damage: 4 }, { attacker: '' }, { target: ' ' }, { attackerKind: 'otro' }, { at: '2026-02-30T12:00:00.000Z' }, { at: 'ayer' }]) {
      assert.equal(parseCombatAttackEvent({ ...attack, ...change }), null);
    }
    assert.equal(parseCombatAttackEvent('Iria ataca'), null);
  });
  it('deja caducar los efectos atrasados y rechaza fechas muy futuras', () => {
    const at = Date.parse(attack.at);
    assert.equal(isFreshCombatEffect(attack, at + 500), true);
    assert.equal(isFreshCombatEffect(attack, at + 8001), false);
    assert.equal(isFreshCombatEffect(attack, at - 1001), false);
  });
  it('mantiene legibles los registros de versiones anteriores', () => {
    assert.equal(combatLogText('Comienza la pelea.'), 'Comienza la pelea.');
    assert.equal(combatLogText(attack), attack.message);
    assert.equal(combatLogText({ type: 'desconocido' }), 'Un acontecimiento del combate.');
  });
});
