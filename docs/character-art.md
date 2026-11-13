# Sistema visual de personajes

Los retratos se construyen en el navegador a partir de atlas transparentes WebP. Las razas eligen el rostro, las profesiones el atuendo y el personaje conserva sus elecciones de peinado y color en los metadatos de apariencia de `characters.notes`. El arma y la mochila usan el equipo guardado en la ficha.

## Cobertura

- 21 rostros, en este orden: Humano, Elfo, Enano, Mediano, Gnomo, Semielfo, Semiorco, Tiefling, Dracónico, Aasimar, Firbolg, Goliat, Kenku, Tabaxi, Tortle, Genasi, Aarakocra, Minotauro, Centauro, Sátiro, Hada.
- 13 atuendos, en este orden: Guerrero, Pícaro, Bárbaro, Clérigo, Paladín, Explorador, Mago, Hechicero, Brujo, Druida, Bardo, Monje, Artífice.
- Tres estilos —Pelón, Cabello corto y Cabello largo— y tres colores —Blanco, Castaño y Negro—.
- Las selecciones pueden combinarse en 2.457 apariencias. El estilo Pelón deja visible el rostro sin añadir una capa de pelo.

## Archivos

Todos los archivos viven en `public/art/characters/`:

- `heads-1.webp` … `heads-6.webp`: retratos de raza, cuatro celdas por atlas en orden de lectura; la última atlas contiene Hada en la primera celda.
- `costumes-1.webp` … `costumes-4.webp`: atuendos de profesión, cuatro celdas por atlas en orden de lectura; la última atlas contiene Artífice en la primera celda.
- `hair-1.webp`: cabello corto Blanco, Castaño y Negro en las primeras tres celdas.
- `hair-2.webp`: cabello largo en los mismos tres colores.

## Dirección de ilustración

Prompt base usado con el generador de imágenes integrado: «Atlas transparente de juego de rol de fantasía oscura pintado a mano, cuadrícula exacta 2 × 2 y sujetos aislados en orden de lectura; luz cálida arriba a la izquierda y relleno frío suave; alta legibilidad a tamaño de retrato; sin texto, marco ni fondo. En los rostros, cabeza calva frontal reconocible de la raza indicada, cuello corto y escala uniforme. En los atuendos, torso frontal sin cabeza ni piel visible, con ropa, material y ornamentos propios de la profesión indicada. En el cabello, pelucas frontales aisladas con el hueco de la cara transparente, el mismo corte en Blanco, Castaño y Negro.» Los atlas conservan canal alfa y se convierten a WebP para reducir el peso de descarga.

Los atlas de armas no se produjeron porque el generador devolvió HTTP 403. El equipo que eligió el jugador se muestra con símbolos accesibles de la interfaz y etiquetas de texto; no se carga ninguna imagen de arma inexistente.
