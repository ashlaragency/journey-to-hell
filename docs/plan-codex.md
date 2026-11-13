# Plan para Codex: 90 minutos de trabajo autónomo

Objetivo de la sesión: que el combate se pueda jugar entero desde el tablero y que sus reglas sean justas y compartidas por toda la mesa. Todo lo de abajo sale de fallos y huecos vistos al probar combates reales el 12 y 13 de noviembre de 2026.

## Contexto que necesitas

- App Vite + React 19 + TypeScript. Supabase (Postgres + Realtime) sin login: cada jugador es un nombre guardado en `localStorage` (`jth_player`).
- El combate es una fila de la tabla `combat`. Los combatientes viven en el JSON `combatants` (tipo `Combatant` en `src/lib/supabase.ts`), con campos opcionales `away` (retaguardia) y `pos` (casilla del tablero).
- Lógica pura y con tests: `src/lib/rearguard.ts` (turnos, retaguardia, final de pelea) y `src/lib/boardCombat.ts` (colocación de fichas, movimiento, último ataque).
- `src/components/Play.tsx` contiene las acciones de combate (`pcAttack`, `enemyAttack`, `nextTurn`, `persistCombat`). `src/components/CombatBoard.tsx` dibuja el tablero 12 × 7 y se usa en Aventura (`Play.tsx`) y en Mesa (`BattleMap.tsx`).
- Toda escritura del combate usa control optimista: solo se guarda si `updated_at` no cambió. Mantén ese patrón.

## Reglas de la sesión

1. Crea la rama `mejoras/combate-desde-tablero` a partir de `mejoras/creador-personajes`. No hagas commit en ninguna otra rama. Al terminar abre un PR contra `mejoras/creador-personajes`.
2. Sin cambios de esquema. No toques `schema.sql` ni ejecutes SQL. Nunca uses el proyecto Supabase «Plomada».
3. La app local escribe en el mundo en vivo. Puedes abrir combates de prueba con los tres personajes que existen, pero cierra siempre el combate al terminar, no registres la caída de nadie, no borres nada y no crees personajes.
4. Lógica nueva en `src/lib/` como funciones puras, con tests en `tests/` escritos antes que el código. Los imports de valor entre archivos de `src/lib` llevan extensión `.ts` para que `node --test` los resuelva.
5. Después de cada tarea: `npm test`, `npm run lint` y `npm run build` deben pasar. Un commit por tarea, con mensaje `feat:` o `fix:` en inglés.
6. Textos de interfaz en español, con el tono del juego. Respeta `prefers-reduced-motion` y la clase `.motion-paused` en cualquier animación.
7. Si una tarea se complica más de lo previsto, déjala anotada en el PR como pendiente y pasa a la siguiente. No dejes código a medias en un commit.

## Tareas, en este orden

### 1. Una acción por turno y daño mínimo (15 min)

Hoy se puede pulsar «Atacar» o «Que ataque» varias veces en el mismo turno, y un golpe acertado puede hacer 0 de daño cuando el bono de fuerza es negativo.

- Tras un ataque (de héroe o de enemigo) guardado con éxito, el turno avanza solo al siguiente combatiente que pueda actuar, en la misma escritura. Usa `nextTurn` y `battleOutcome` de `rearguard.ts`; si la pelea termina con ese golpe, ciérrala.
- Un golpe que acierta hace como mínimo 1 de daño.
- El botón «Siguiente turno» se queda como «Pasar turno».
- Hecho cuando: hay tests para el avance tras atacar y para el daño mínimo, y en un combate real no se puede atacar dos veces seguidas con el mismo combatiente.

### 2. Atacar desde el tablero (30 min)

Hoy el tablero solo deja mover fichas; los ataques se lanzan con botones debajo.

- Saca `pcAttack`, `enemyAttack`, el paso de turno y `persistCombat` de `Play.tsx` a un hook `src/hooks/useCombatActions.ts`, sin cambiar su comportamiento. `Play.tsx` pasa a usar el hook.
- En `CombatBoard`, cuando es el turno de un héroe en el frente: tocar su ficha y después una ficha enemiga viva lanza el ataque. Las fichas enemigas atacables se resaltan mientras hay un héroe con turno seleccionado.
- En el turno de un enemigo, el tablero muestra un botón «Que ataque» sobre su ficha o junto al tablero.
- En la pestaña Mesa el tablero usa el mismo hook, así que también se puede pelear desde ahí. Quita el aviso de que hay que ir a Aventura para resolver acciones.
- Los botones de ataque de la lista siguen funcionando.
- Hecho cuando: se puede jugar un combate completo sin salir del tablero, en Aventura y en Mesa.

### 3. Tiradas para no morir compartidas (20 min)

Hoy los éxitos y fallos viven en el estado de una sola pestaña: se pierden al recargar y nadie más los ve.

- Guarda el marcador en `characters.notes` con un marcador igual al de apariencia (`src/lib/appearance.ts` es el modelo): `<!--jth-death:v1:<exitos>:<fallos>-->`. Funciones puras `readDeathSaves` y `writeDeathSaves` en `src/lib/deathSaves.ts`, con tests de ida y vuelta que conserven el marcador de apariencia y el texto libre.
- El marcador se borra cuando el personaje recupera vida por encima de 0 o cuando se registra su caída.
- `Play.tsx` lee el marcador desde la ficha y deja de usar el estado local `deathSaves`.
- Hecho cuando: el marcador sobrevive a recargar la página y se ve igual en dos pestañas.

### 4. Retirada automática desde cualquier pestaña y control del Infernalista (15 min)

Hoy la retirada por desconexión solo ocurre si alguien tiene abierta la pestaña Aventura, y solo el dueño puede devolver a su personaje.

- Mueve la vigilancia de ausencias de `Play.tsx` a un hook montado en `App.tsx`, para que funcione en cualquier pestaña. Usa `useActiveCombat` y `saveCombatMove` de `src/hooks/useActiveCombat.ts` como base para leer y guardar.
- En la mesa del Infernalista (`Infernalista.tsx`), cada héroe de la lista de iniciativa tiene un botón para mandarlo a la retaguardia o devolverlo al frente.
- Hecho cuando: con la app en la pestaña Mesa, un personaje cuyo jugador se fue pasa a la retaguardia a los 90 segundos.

### 5. Cierre (10 min)

- Corrige en `README.md` las rutas desfasadas (`../schema.sql`, `cd app`): ahora todo vive en la raíz del repositorio. Añade una sección corta sobre la retaguardia y el combate en el tablero.
- Abre el PR con: qué cambia, cómo se verificó cada tarea, y qué quedó sin hacer o sin verificar.

## Si sobra tiempo

Salón de los caídos: una sección en la pestaña Crónica que muestre a cada personaje caído con su retrato (`CharacterPortrait`), su `death_note` y sus legados de la tabla `legacies`. Solo lectura, sin cambios de esquema.

## Fuera de alcance

- Cuentas, login o cualquier cambio en cómo se identifica al jugador.
- Cambios en retratos o en los atlas de `public/art/characters/`.
- Integrar ramas en `main` o desplegar.
