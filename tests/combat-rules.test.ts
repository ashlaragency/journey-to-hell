import assert from 'node:assert/strict';
import test from 'node:test';
import { minimumHitDamage } from '../src/lib/combatRules.ts';

test('un impacto siempre causa al menos un punto de daño', () => {
  assert.equal(minimumHitDamage(0), 1);
  assert.equal(minimumHitDamage(-4), 1);
  assert.equal(minimumHitDamage(5), 5);
});

test('un resultado de daño inválido no convierte un impacto en daño cero', () => {
  assert.equal(minimumHitDamage(Number.NaN), 1);
  assert.equal(minimumHitDamage(Number.POSITIVE_INFINITY), 1);
});
