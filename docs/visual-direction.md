# Mundo vivo, mesa encantada y grimorio

Dirección elegida por el usuario el 12 de noviembre de 2026 a partir de tres conceptos visuales. La aventura usa una escena cinematográfica; el mapa mantiene una mesa táctica 2D con medallones; el Infernalista dirige desde un libro de pergamino. Los conceptos son exploraciones artísticas, no capturas de software ni promesas de un motor 3D.

## Recursos originales

Generados con la herramienta integrada imagegen. Los originales se conservaron; se exportaron a WebP con calidad 86 para el proyecto. No se modificaron los 43 mapas existentes ni los datos del Atlas.

| Archivo | Uso | Tamaño |
| --- | --- | --- |
| `public/art/world-gate.webp` | Ambiente exterior del mundo | 334,020 bytes |
| `public/art/tavern-interior.webp` | Escenas de taberna | 279,792 bytes |
| `public/art/grimoire-guardian.webp` | Ilustración del grimorio | 328,730 bytes |

Los fondos son ilustrativos y no sustituyen el plano táctico. No se precargan todas las ilustraciones a la vez. El Infernalista y el mapa mantienen sus componentes y estilos en cargas diferidas.

## Prompts de producción

### Puerto

Use case: illustration-story. Production environment background for Journey to Hell, an original dark-fantasy role-playing game. Wide 16:9 landscape, no interface, NO TEXT, no letters, no watermark. A living medieval harbor settlement at blue twilight, enormous ruined gothic gate with twin hooded stone statues in the far center, narrow winding wet cobbled path, warm lit tavern windows at right, tiny travelers and townspeople for scale, sailing boats at left, distant birds, fine rising mist and scattered amber embers. Exquisite painterly realistic fantasy environment art, layered cinematic depth, intricate atmospheric architecture, deep petrol and ink-blue shadows, warm copper firelight. Bottom quarter and left third relatively calm darker areas for UI overlays, compelling illuminated gate focal point center right. No modern objects, no branding, no grid, no battle map, no large foreground character. Rich hand painted craftsmanship and an inhabited world, sophisticated restrained color.

### Taberna

Use case: illustration-story. Production environment background for Journey to Hell, original dark fantasy role playing game. Widescreen16:9 eye-level view inside a magical medieval tavern at night, NOT top down, no text, no UI, no logos, no grid. Exquisite cinematic painterly realistic fantasy art. A few travelers with cloaks in soft focus at wooden tables, innkeeper behind long bar, wrought iron lanterns, warm brick fireplace far right, hanging herbs, a cat under a stool, intricate leaded moonlit window far left. A hooded visitor near a half-open door suggests mystery. Amber glow and deep midnight teal shadows, misty light shafts through window, believable medieval materials, warm living atmosphere but dangerous world beyond. Focal interest upper center and right, broad calm darkish bottom third for text overlay, very high craftsmanship, expansive inviting storytelling scene. Not cute cartoon, not horrific, no gore, no frontal large character.

### Guardián del grimorio

Use case: illustration-story. A wide 16:9 original fantasy engraving on warm antique ivory vellum for a digital game-master grimoire called Journey to Hell. NO LETTERS OR TEXT OR UI. Fine detailed black ink copperplate etching with a restrained dark oxblood watercolor wash: tall mysterious ancient knight in ornate bone armor and a crown of antlers on the right half, not aggressive or bloody, overlooking a tiny medieval hilltop village in mist at lower right. Surreal crimson ink wisps drift from the shoulder and become a bird flock. Left half nearly blank softly textured ivory parchment, composition naturally fades to paper in all edges, borderless illustration intended to blend into a book UI. Literary illuminated manuscript style, exquisite lines and delicate crosshatching, warm pale parchment background #eadcbd, mostly ink with minimal burgundy. No photo objects, no book frame, no weapon foreground, no symbols resembling text, no watermarks.

## Movimiento y lectura

La animación ambiental usa transformaciones y opacidad. Se puede pausar en la cabecera, respeta `prefers-reduced-motion` y se pausa al ocultar la pestaña. El texto nunca depende de una animación para poder leerse. La actividad proviene de eventos guardados y la presencia de conexiones Realtime, sin contadores ficticios.
