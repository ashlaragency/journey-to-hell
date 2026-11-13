import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  DEFAULT_APPEARANCE,
  HAIR_COLORS,
  HAIR_STYLES,
  describeAppearance,
  readAppearance,
  resolvePortraitAssets,
  writeAppearance,
  type CharacterAppearance,
} from '../src/lib/appearance.ts';
import { CLASSES, SPECIES } from '../src/lib/data.ts';

test('missing or old notes receive the appearance default without losing prose', () => {
  assert.deepEqual(readAppearance(null), DEFAULT_APPEARANCE);
  assert.deepEqual(readAppearance('Una historia antigua'), DEFAULT_APPEARANCE);
  assert.equal(writeAppearance('Una historia antigua', DEFAULT_APPEARANCE), 'Una historia antigua\n<!--jth-appearance:v1:short:black-->');
});

test('appearance markers round-trip while preserving story text and replacing prior choices', () => {
  const original: CharacterAppearance = { version: 1, hairStyle: 'long', hairColor: 'white' };
  const updated: CharacterAppearance = { version: 1, hairStyle: 'bald', hairColor: 'brown' };
  const saved = writeAppearance('La historia sigue.', original);
  assert.deepEqual(readAppearance(saved), original);
  const changed = writeAppearance(saved, updated);
  assert.deepEqual(readAppearance(changed), updated);
  assert.equal(changed.match(/jth-appearance/g)?.length, 1);
  assert.ok(changed.startsWith('La historia sigue.'));
});

test('feathered ancestries use feather language for non-bald hairstyles', () => {
  assert.equal(describeAppearance({ version: 1, hairStyle: 'short', hairColor: 'brown' }, 'Kenku'), 'Cresta corta de plumas castañas');
  assert.equal(describeAppearance({ version: 1, hairStyle: 'long', hairColor: 'white' }, 'Aarakocra'), 'Cresta larga de plumas blancas');
  assert.equal(describeAppearance({ version: 1, hairStyle: 'bald', hairColor: 'white' }, 'Kenku'), 'Sin cabello');
});

test('all races, professions, hair styles and colors resolve to transparent atlas tiles', () => {
  let combinations = 0;
  const seenHeads = new Set<string>();
  const seenCostumes = new Set<string>();
  for (const species of SPECIES) {
    for (const profession of CLASSES) {
      for (const style of HAIR_STYLES) {
        for (const color of HAIR_COLORS) {
          const assets = resolvePortraitAssets(species.name, profession.name, { version: 1, hairStyle: style.id, hairColor: color.id });
          assert.ok(assets, `${species.name} + ${profession.name} should resolve`);
          assert.ok(assets.head.file.startsWith('heads-'));
          assert.ok(assets.costume.file.startsWith('costumes-'));
          assert.ok(assets.head.tile >= 0 && assets.head.tile < 4);
          assert.ok(assets.costume.tile >= 0 && assets.costume.tile < 4);
          if (style.id === 'bald') assert.equal(assets.hair, null);
          else {
            assert.ok(assets.hair);
            assert.ok(assets.hair.file.startsWith(style.id === 'short' ? 'hair-1' : 'hair-2'));
            assert.ok(assets.hair.tile >= 0 && assets.hair.tile < 3);
          }
          seenHeads.add(`${assets.head.file}:${assets.head.tile}`);
          seenCostumes.add(`${assets.costume.file}:${assets.costume.tile}`);
          combinations += 1;
        }
      }
    }
  }
  assert.equal(SPECIES.length, 21);
  assert.equal(CLASSES.length, 13);
  assert.equal(combinations, 2457);
  assert.equal(seenHeads.size, SPECIES.length);
  assert.equal(seenCostumes.size, CLASSES.length);
  for (let atlas = 1; atlas <= 6; atlas += 1) {
    assert.ok(existsSync(fileURLToPath(new URL(`../public/art/characters/heads-${atlas}.webp`, import.meta.url))));
  }
  for (let atlas = 1; atlas <= 4; atlas += 1) {
    assert.ok(existsSync(fileURLToPath(new URL(`../public/art/characters/costumes-${atlas}.webp`, import.meta.url))));
  }
  for (const file of ['hair-1.webp', 'hair-2.webp']) {
    assert.ok(existsSync(fileURLToPath(new URL(`../public/art/characters/${file}`, import.meta.url))));
  }
});
