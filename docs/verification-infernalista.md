# Verificación de la mesa viva

Fecha de la auditoría: 12 de noviembre de 2026. Rama `mejoras/mesa-infernalista`, construida sobre `mejoras/sonido-inmersivo`. Solo se utilizó el cliente anon de `dnd-mundo-vivo` (`lewyzkdhwrdiiorwsfgh`). No se cambió el esquema ni se usó una clave privilegiada.

## Reproducible en el repositorio

- `npm run build`: TypeScript y Vite correctos.
- `npm test`: doce pruebas de los contratos de escenas y ataques, validación de entradas y orden de eventos. Requiere Node 22.18 o posterior.
- `node scripts/verify-atlas.mjs`: nueve zonas, 34 lugares y 43 mapas correctos.
- `git diff --check`: correcto.
- `npm run lint`: permanece el aviso previo `react(set-state-in-effect)` de BattleMap. Vite mantiene el aviso de bundle inicial superior a 500 kB. No se ocultaron estos avisos.

## Navegador y datos simulados

Chrome de escritorio (1440 px), Chrome móvil y WebKit móvil (390 px). La suite de navegador usó Playwright y axe desde el entorno de auditoría, sin añadir dependencias de ejecución al juego. Las pruebas destructivas o de error interceptan todas las escrituras y Realtime.

- Publicar una escena actualiza el segundo contexto. Un 503 conserva la escena anterior y muestra cómo reintentar.
- Un doble clic genera una única publicación confirmada. Recargar recupera la escena persistida; avanzar y liberar el recorrido se reflejan en ambos contextos.
- Iniciativa compartida, cambio de turno, fallo de guardado y cierre de encuentro verificados en ambos contextos.
- Una acción atrasada no revierte el turno del Infernalista. Los cambios usan la revisión `updated_at` que leyó el cliente.
- Daño enemigo de cuatro puntos deja la vida de 12 en 8, tanto en combate como en la hoja.
- Las hojas selladas no admiten cambios de vida desde el mapa. Un error de escritura no actualiza visualmente la vida. Una tirada de recuperación sin filas confirmadas no afirma que el personaje se recuperó.
- Añadir, mover, medir y guardar fichas verificados. Dos casillas corresponden a diez pies. El tablero puede desplazarse dentro de su marco en móvil.
- Pausa ambiental persistente, reactivación, preferencia de movimiento reducido, texto visible durante la pausa y acceso rápido a los dados.
- Cero errores JavaScript finales y sin desbordamiento horizontal de la página. Axe no detecta infracciones WCAG AA en aventura, Infernalista o mesa táctica.

## Ataques audiovisuales

Nueve escenarios adicionales con dos contextos y fuentes reales de Web Audio, usando escrituras y Realtime simulados. Impacto y fallo producen una animación y una única fuente de sonido en cada sesión, incluido el Infernalista. Silenciar conserva el resultado visual. Los errores de escritura y los conflictos de turno no producen efectos de ataque. La recarga, un eco duplicado y un cambio de turno no reproducen el golpe otra vez. Las pestañas ocultas descartan los efectos; movimiento reducido y pausa conservan el resultado estático.

El evento viaja en `Combatant.last_attack`, dentro del mismo JSONB y la misma escritura que el resultado del combate. `combat.log` conserva texto para que los clientes anteriores sigan funcionando. El receptor valida el evento, comprueba que corresponde a la actualización del ataque y deduplica su ID. La cola está limitada a tres efectos y caducan a los ocho segundos. Cada jugador controla su propio volumen.

## Dos sesiones reales

Dos contextos independientes, `Vigía del Umbral` y `Explorador del Umbral`, conectados al mismo mundo. Antes de comenzar se verificó que no hubiera combate activo ni escena dirigida anterior.

| Operación | Resultado observado |
| --- | --- |
| Compartir la primera escena | El segundo jugador la recibe sin recargar en 515 ms |
| Compartir la siguiente | El segundo jugador la recibe sin recargar en 809 ms |
| Recargar al jugador | Recupera la segunda escena guardada |
| Dejar recorrido libre | Ambos reciben el cambio, observado en 845 ms |
| Recargar y cambiar de rol | Dos participantes, sin duplicar la presencia |
| Cerrar una sesión | Desaparece de la mesa |

Se conservaron estos tres eventos como parte de la historia, sin borrar filas:

- `a438fb05-78d0-4d9f-a3ed-fd53f2d7aa8e`
- `206e12fc-e6e1-45f5-aa16-36eb3f1afb51`
- `6a97d56a-898f-454e-9677-fd2676a83269`

El último tiene `active:false`. No se modificaron personajes, legados ni mapas durante esta prueba.

## Decisiones y límites

La escena compartida se guarda como un evento versionado en `world_events`. La crónica convierte el evento a texto legible. La carga inicial, los eventos en vivo y la recuperación tras reconectar respetan el orden de la escena para que una consulta antigua no reemplace una actualización más reciente.

El Infernalista es una vista para una mesa de confianza. El proyecto sigue sin cuentas ni permisos privados; los jugadores acuerdan quién dirige. Iniciar encuentros simultáneamente desde dos directores no está protegido por una restricción única de base de datos. El guardado del combate y la hoja de personaje siguen siendo escrituras distintas; si la segunda falla, el juego lo indica.

Las latencias son observaciones de esta prueba, no garantías de servicio. Sigue pendiente la evaluación de sensación y rendimiento en un iPhone o Android físico.

La sincronización usa [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes). La animación respeta [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion).
