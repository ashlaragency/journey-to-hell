import assert from 'node:assert/strict';
import test from 'node:test';
import { clearDeathSaves, readDeathSaves, resolveDeathSave, writeDeathSaves } from '../src/lib/deathSaves.ts';

test('death saves round-trip without losing appearance or story text', () => {
  const notes = 'Una marca de batalla.\n<!--jth-appearance:v1:long:white-->';
  const changed = writeDeathSaves(notes, { successes: 2, failures: 1 });

  assert.deepEqual(readDeathSaves(changed), { successes: 2, failures: 1 });
  assert.match(changed, /Una marca de batalla\./);
  assert.match(changed, /<!--jth-appearance:v1:long:white-->/);
  assert.match(changed, /<!--jth-death:v1:2:1-->/);
});

test('rewriting death saves replaces only the death marker', () => {
  const first = writeDeathSaves('Nota libre\n<!--jth-appearance:v1:short:black-->', { successes: 1, failures: 0 });
  const second = writeDeathSaves(first, { successes: 0, failures: 2 });

  assert.equal(second.match(/jth-death:v1/g)?.length, 1);
  assert.deepEqual(readDeathSaves(second), { successes: 0, failures: 2 });
  assert.match(second, /<!--jth-appearance:v1:short:black-->/);
  assert.match(second, /Nota libre/);
});

test('missing, malformed, and out-of-range markers read safely', () => {
  assert.deepEqual(readDeathSaves(null), { successes: 0, failures: 0 });
  assert.deepEqual(readDeathSaves('<!--jth-death:v1:x:9-->'), { successes: 0, failures: 0 });
  assert.deepEqual(readDeathSaves('<!--jth-death:v1:8:-1-->'), { successes: 0, failures: 0 });
});

test('death save outcomes cap at three and a natural twenty recovers', () => {
  assert.deepEqual(resolveDeathSave({ successes: 2, failures: 0 }, 18), { saves: { successes: 3, failures: 0 }, recovered: false });
  assert.deepEqual(resolveDeathSave({ successes: 0, failures: 2 }, 1), { saves: { successes: 0, failures: 3 }, recovered: false });
  assert.deepEqual(resolveDeathSave({ successes: 2, failures: 1 }, 20), { saves: { successes: 0, failures: 0 }, recovered: true });
});

test('clearing death saves keeps appearance and free text intact', () => {
  const notes = writeDeathSaves('El cuervo lo recuerda.\n<!--jth-appearance:v1:bald:black-->', { successes: 2, failures: 1 });
  const cleared = clearDeathSaves(notes);

  assert.equal(cleared, 'El cuervo lo recuerda.\n<!--jth-appearance:v1:bald:black-->');
  assert.deepEqual(readDeathSaves(cleared), { successes: 0, failures: 0 });
  assert.equal(clearDeathSaves(null), null);
});
