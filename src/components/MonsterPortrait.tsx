import type { CSSProperties } from 'react';

const portraits = [
  ['Goblin', 'Orco', 'Esqueleto', 'Zombi', 'Lobo', 'Lobo terrible', 'Oso pardo', 'Araña gigante', 'Serpiente venenosa', 'Murciélago gigante', 'Rata gigante', 'Buho gigante'],
  ['Gnoll', 'Kobold', 'Hobgoblin', 'Bandido', 'Cultista', 'Fantasma', 'Espectro', 'Momia', 'Ogro', 'Trol', 'Hombre lobo', 'Dragón rojo joven'],
  ['Perro asustado', 'Eco hambriento', 'Sombra robada', 'Payaso sin risa', 'Gaviota embrujada', 'Marinero ahogado', 'Insomne furioso', 'Pesadilla pequeña', 'Guardia de piedra', 'Ladrón de recuerdos', 'Lobo de raíces', 'Espina andante'],
];

function normalize(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

const portraitByName = new Map(portraits.flatMap((names, sheet) =>
  names.map((name, index) => [normalize(name), { sheet, index }] as const),
));

const aliases: Record<string, string> = {
  'bandido del fuego': 'bandido',
  'goblin travieso': 'goblin',
  'rata de alcantarilla': 'rata gigante',
  'esqueleto mojado': 'esqueleto',
};

export default function MonsterPortrait({ name, className = '' }: { name: string; className?: string }) {
  const normalized = normalize(name).replace(/\s+\d+$/, '');
  const portrait = portraitByName.get(aliases[normalized] ?? normalized);
  if (!portrait) {
    return <span className={`monster-portrait portrait-unknown ${className}`} aria-hidden="true">?</span>;
  }
  const style: CSSProperties = {
    backgroundImage: `url("/art/bestiary-${portrait.sheet + 1}.webp")`,
    backgroundPosition: `${(portrait.index % 4) * 100 / 3}% ${Math.floor(portrait.index / 4) * 50}%`,
  };
  return <span className={`monster-portrait ${className}`} style={style} aria-hidden="true" />;
}
