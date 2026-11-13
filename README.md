# Journey to Hell — app web multijugador

Juego de rol estilo D&D (sin usar el nombre Dungeons & Dragons): un solo mundo
persistente donde cada jugador tiene su propio personaje, la muerte es permanente
y los restos de los caídos quedan en el mundo (tumbas, canciones, leyendas, objetos).

## Stack

- Vite + React 19 + TypeScript
- Supabase (Postgres + Realtime) — proyecto `dnd-mundo-vivo`
  (`https://lewyzkdhwrdiiorwsfgh.supabase.co`, ref `lewyzkdhwrdiiorwsfgh`)
- Despliegue: Vercel, proyecto `journey-to-hell` (equipo Ashlar Agency),
  ya enlazado con Supabase. Dominio al desplegar: `journey-to-hell.vercel.app`.

## 1. Crear las tablas en Supabase (OBLIGATORIO, hacerlo a mano)

La contraseña de la base de datos no quedó registrada, así que el SQL **no se
puede aplicar desde aquí**. Pasos:

1. Abre el panel de Supabase del proyecto **dnd-mundo-vivo**
   (https://supabase.com/dashboard/project/lewyzkdhwrdiiorwsfgh).
2. Ve a **SQL Editor → New query**.
3. Pega TODO el contenido de `schema.sql` y pulsa **Run**.
4. Comprueba con:
   - `select count(*) from public.worlds;` → 1
   - `select count(*) from public.adventures;` → 9
   - `select count(*) from public.scenes;` → 27
   - `select count(*) from public.enemies;` → 18

⚠️ **NUNCA aplicar este SQL en el proyecto «Plomada»** (ref cxwsjatynrzeabxukolh).
Ese proyecto es de solo lectura y no se toca.

El SQL crea 11 tablas con RLS activado y Realtime: `worlds`, `characters`,
`legacies`, `adventures`, `scenes`, `enemies`, `combat`, `dice_rolls`,
`journal_entries`, `world_events`, `battle_maps`. Además siembra el mundo
«Journey to Hell», las 9 aventuras (3 cortas de 1 h, 3 medias de 2-3 h,
3 largas de mundo vivo) con 3 escenas y 2 enemigos precargados cada una.

Hasta que se aplique el SQL, la app carga pero muestra el aviso
«Las tablas del juego aún no están listas» y usa las aventuras de respaldo
locales (solo lectura, sin sincronización).

## 2. Desarrollo local

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # compila a dist/
```

La app usa el proyecto `dnd-mundo-vivo` y una clave anon pública. Para otro
entorno local puedes definir `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en
un archivo `.env` local; no subas ese archivo ni uses una clave `service_role`
o una contraseña de base de datos.

## 3. Desplegar en Vercel

Opción A (recomendada): conectar el repositorio de GitHub al proyecto
`journey-to-hell` en Vercel (Add New → Project → Import Git Repository).
Cada push a la rama principal despliega solo.

Opción B: con Vercel CLI, ejecuta `vercel` desde la raíz del repositorio y
elige el proyecto `journey-to-hell` ya enlazado. Comprueba la vista previa
antes de promover una versión a producción.

## Qué tiene la app

- **Jugar**: recorrido lineal guiado. Escena actual arriba («Estás aquí»),
  pregunta «¿Qué haces?» con opciones grandes en lenguaje simple que tiran
  solas el dado correcto, resultado explicado en palabras simples, botón
  Continuar. Combate con enemigos precargados, turnos, tirada para no morir
  y «Registrar su caída».
- **Personajes**: creador guiado en 9 pasos donde SOLO se escribe el nombre;
  todo lo demás se elige tocando (21 especies, 13 clases, 12 trasfondos,
  habilidades, equipo, rasgos, motivaciones; vida y defensa calculadas solas).
  Hojas con vida editable, caídos sellados con ☠️ y nombre no reutilizable.
- **Mundo**: ley del mundo visible, las 9 aventuras por duración,
  «Restos y legado» (tumba, canción, leyenda, objeto, lugar),
  generadores del mundo vivo (rumor, evento, consecuencia, evolución de PNJ)
  y crónica del mundo.
- **Mapa**: mapa de batalla con cuadrícula, fichas de personajes y enemigos,
  regla de movimiento (30 pies por turno) y regla de distancias.
- **Compendio**: buscable — 24 monstruos, 24 hechizos, 12 condiciones,
  8 acciones de combate (contenido SRD básico).
- **Dados**: bandeja d4–d100 con animación, ventaja/desventaja y registro
  visible para todos.
- Todo sincronizado en vivo con Supabase Realtime: tiradas, vida, iniciativa
  y crónica se ven en todos los dispositivos a la vez. Sin cuentas ni login:
  cada jugador se identifica por su nombre de jugador.

## Combate en el tablero y retaguardia

En Aventura o en Mesa, selecciona al héroe que tiene el turno y toca una
criatura resaltada para atacar. En el turno de una criatura, usa **Que ataque**
junto al tablero. Un ataque guardado avanza la iniciativa en la misma escritura;
el efecto visual y el sonido se comparten con la mesa en vivo. Los botones de
ataque de la lista siguen disponibles.

Si un jugador pierde conexión, su héroe se repliega a la retaguardia tras 90
segundos y deja de ser un objetivo. El Infernalista también puede replegarlo o
devolverlo al frente desde la iniciativa. Las tiradas para no morir se guardan
en la ficha y permanecen al recargar o abrir otra pestaña.

## Estructura

```
schema.sql                 Migración SQL (aplicar a mano en Supabase)
src/lib/data.ts            Catálogos del creador (especies, clases, equipo…)
src/lib/compendium.ts      Compendio y las 9 aventuras (respaldo local)
src/lib/supabase.ts        Cliente Supabase + tipos + dados
src/components/Play.tsx    Aventura y combate
src/components/CombatBoard.tsx
src/components/CharacterCreator.tsx
src/components/DiceTray.tsx
src/components/BattleMap.tsx
src/components/Compendium.tsx
src/components/WorldPanel.tsx
src/App.tsx                Pestañas, estado global, Realtime
tests/                     Pruebas de reglas y marcadores persistentes
```
