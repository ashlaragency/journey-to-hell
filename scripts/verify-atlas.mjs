// Verificación de la integración del atlas (solo lectura).
// Comprueba por código: 34 lugares, 43 mapas, ruta del descenso,
// travesías, entradas menores, accesos especiales y Garganta en 9 días.
// Uso: node scripts/verify-atlas.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src/lib/atlas.ts'), 'utf8');
const mapsDir = join(root, 'public/maps');

let fails = 0;
function check(ok, msg) {
  console.log(`${ok ? 'OK  ' : 'FALLO'} ${msg}`);
  if (!ok) fails++;
}
function blockAfter(srcText, marker) {
  const i = srcText.indexOf(marker);
  const j = srcText.indexOf('];', i);
  return srcText.slice(i, j);
}
function lugarIds(text) {
  return [...text.matchAll(/'(lugar-\d+)'/g)].map((m) => m[1]);
}

// --- Lugares ---
const lugarIdsAll = lugarIds(blockAfter(src, 'export const LUGARES'));
check(lugarIdsAll.length === 34, `lugares: ${lugarIdsAll.length} (esperados 34)`);
check(new Set(lugarIdsAll).size === 34, 'lugares: ids únicos');
for (let n = 1; n <= 34; n++) {
  if (!lugarIdsAll.includes(`lugar-${n}`)) check(false, `falta lugar-${n}`);
}
const lugarSet = new Set(lugarIdsAll);

// --- Zonas ---
const zonaBlock = blockAfter(src, 'export const ZONAS');
const zonaIds = lugarIds(zonaBlock);
check(zonaIds.length === 34, `zonas cubren 34 lugares (tienen ${zonaIds.length})`);
check(new Set(zonaIds).size === 34, 'zonas: sin lugar repetido ni faltante');
const zonaNombres = [...src.matchAll(/nombre: '([^']+)', lugares:/g)].map((m) => m[1]);
check(zonaNombres.length === 9, `zonas: ${zonaNombres.length} (esperadas 9)`);

// --- Mapas ---
const slugs = [...src.matchAll(/slug: '([a-z0-9-]+)'/g)].map((m) => m[1]);
check(slugs.length === 43, `mapas referenciados: ${slugs.length} (esperados 43)`);
check(new Set(slugs).size === 43, 'mapas: slugs únicos');
const files = readdirSync(mapsDir).filter((f) => f.endsWith('.webp'));
check(files.length === 43, `archivos en public/maps: ${files.length} (esperados 43)`);
let missing = 0;
for (const slug of slugs) {
  const p = join(mapsDir, `${slug}.webp`);
  let ok = false;
  try {
    ok = statSync(p).size > 0;
  } catch {
    ok = false;
  }
  if (!ok) {
    missing++;
    console.log(`FALLO mapa sin archivo o vacío: ${slug}.webp`);
  }
}
if (missing > 0) fails += missing;
else console.log('OK   los 43 mapas referenciados existen en public/maps/ y no están vacíos');
const sinImagen = lugarIdsAll.filter((id) => {
  const m = src.match(new RegExp(`id: '${id}',[\\s\\S]{0,400}?mapas: \\[\\]`, ''));
  return !!m;
});
check(
  sinImagen.length === 3 && sinImagen.includes('lugar-13') && sinImagen.includes('lugar-14') && sinImagen.includes('lugar-15'),
  `lugares sin imagen: ${sinImagen.join(', ')} (esperados lugar-13, lugar-14, lugar-15)`,
);

// --- Ruta del descenso ---
const ruta = lugarIds(blockAfter(src, 'export const RUTA_DEL_DESCENSO'));
check(ruta.length === 15, `ruta del descenso: ${ruta.length} paradas (esperadas 15)`);
check(new Set(ruta).size === 15, 'ruta: sin paradas repetidas');
const rutaEsperada = ['lugar-1', 'lugar-2', 'lugar-3', 'lugar-4', 'lugar-17', 'lugar-18', 'lugar-19', 'lugar-20', 'lugar-24', 'lugar-25', 'lugar-26', 'lugar-27', 'lugar-28', 'lugar-29', 'lugar-30'];
check(JSON.stringify(ruta) === JSON.stringify(rutaEsperada), 'ruta: orden exacto del atlas');
for (const id of ruta) check(lugarSet.has(id), `ruta resuelve: ${id}`);

// --- Travesías ---
const trav = blockAfter(src, 'export const TRAVESIAS');
const travIds = lugarIds(trav);
check(travIds.length === 14, `travesías: ${travIds.length} paradas en total (esperadas 14)`);
for (const id of travIds) check(lugarSet.has(id), `travesía resuelve: ${id}`);
const travCount = (trav.match(/paradas: \[/g) || []).length;
check(travCount === 5, `travesías: ${travCount} (esperadas 5)`);

// --- Entradas menores ---
const ent = blockAfter(src, 'export const ENTRADAS_MENORES');
const entDesde = [...ent.matchAll(/desde: '(lugar-\d+)'/g)].map((m) => m[1]);
check(entDesde.length === 4, `entradas menores: ${entDesde.length} (esperadas 4)`);
for (const id of entDesde) check(lugarSet.has(id), `entrada resuelve origen: ${id}`);
const entDestinos = [...ent.matchAll(/destinos: \[([^\]]*)\]/g)].map((m) => lugarIds(m[1])).flat();
for (const id of entDestinos) check(lugarSet.has(id), `entrada resuelve destino: ${id}`);
const abiertos = (ent.match(/destinoAbierto: true/g) || []).length;
check(abiertos === 3, `entradas con destino abierto: ${abiertos} (esperadas 3: Sehet-Amar, Mar Ciego, Ignara)`);
check(ent.includes("destinos: ['lugar-24', 'lugar-23']"), 'entrada Brunnak: destinos Cinerea y Páramo');

// --- Accesos especiales ---
const acc = blockAfter(src, 'export const ACCESOS_ESPECIALES');
const accIds = lugarIds(acc);
check(accIds.length === 2, `accesos especiales: ${accIds.length} (esperados 2)`);
for (const id of accIds) check(lugarSet.has(id), `acceso resuelve: ${id}`);

// --- Garganta en 9 días ---
const garg = blockAfter(src, 'export const GARGANTA_NUEVE_DIAS');
const dias = [...garg.matchAll(/dia: (\d+)/g)].map((m) => Number(m[1]));
check(dias.length === 9, `Garganta: ${dias.length} días (esperados 9)`);
check(JSON.stringify(dias) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9]), 'Garganta: días 1..9 en orden');

console.log(fails === 0 ? '\nTODO OK' : `\nFALLOS: ${fails}`);
process.exit(fails === 0 ? 0 : 1);
