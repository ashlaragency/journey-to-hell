import { CLASSES, SPECIES } from './data.ts';

export type HairStyle = 'bald' | 'short' | 'long';
export type HairColor = 'white' | 'brown' | 'black';

export interface CharacterAppearance {
  version: 1;
  hairStyle: HairStyle;
  hairColor: HairColor;
}

export const HAIR_STYLES: Array<{ id: HairStyle; label: string }> = [
  { id: 'bald', label: 'Pelón' },
  { id: 'short', label: 'Cabello corto' },
  { id: 'long', label: 'Cabello largo' },
];

export const HAIR_COLORS: Array<{ id: HairColor; label: string }> = [
  { id: 'white', label: 'Blanco' },
  { id: 'brown', label: 'Castaño' },
  { id: 'black', label: 'Negro' },
];

export const DEFAULT_APPEARANCE: CharacterAppearance = {
  version: 1,
  hairStyle: 'short',
  hairColor: 'black',
};

export interface PortraitAtlasTile {
  file: string;
  tile: number;
}

export interface CharacterPortraitAssets {
  head: PortraitAtlasTile;
  costume: PortraitAtlasTile;
  hair: PortraitAtlasTile | null;
}

/** Map catalog choices onto shared 2×2 atlases; one atlas works for every race/class combination. */
export function resolvePortraitAssets(
  species: string,
  profession: string,
  appearance: CharacterAppearance = DEFAULT_APPEARANCE,
): CharacterPortraitAssets | null {
  const speciesIndex = SPECIES.findIndex((item) => item.name === species);
  const professionIndex = CLASSES.findIndex((item) => item.name === profession);
  if (speciesIndex < 0 || professionIndex < 0) return null;
  const hairColorTile = appearance.hairColor === 'white' ? 0 : appearance.hairColor === 'brown' ? 1 : 2;
  return {
    head: { file: `heads-${Math.floor(speciesIndex / 4) + 1}.webp`, tile: speciesIndex % 4 },
    costume: { file: `costumes-${Math.floor(professionIndex / 4) + 1}.webp`, tile: professionIndex % 4 },
    hair: appearance.hairStyle === 'bald'
      ? null
      : { file: `hair-${appearance.hairStyle === 'short' ? '1' : '2'}.webp`, tile: hairColorTile },
  };
}

const MARKER = /<!--jth-appearance:v1:(bald|short|long):(white|brown|black)-->/;
const ALL_MARKERS = /\n?<!--jth-appearance:v1:(?:bald|short|long):(?:white|brown|black)-->/g;

export function readAppearance(notes?: string | null): CharacterAppearance {
  const match = notes?.match(MARKER);
  return match
    ? { version: 1, hairStyle: match[1] as HairStyle, hairColor: match[2] as HairColor }
    : DEFAULT_APPEARANCE;
}

/** Persist appearance in the existing notes field without discarding the story text. */
export function writeAppearance(notes: string | null | undefined, appearance: CharacterAppearance): string {
  const cleanNotes = (notes ?? '').replace(ALL_MARKERS, '').trim();
  const marker = `<!--jth-appearance:v1:${appearance.hairStyle}:${appearance.hairColor}-->`;
  return cleanNotes ? `${cleanNotes}\n${marker}` : marker;
}

export function describeAppearance(appearance: CharacterAppearance, species?: string): string {
  const style = HAIR_STYLES.find((choice) => choice.id === appearance.hairStyle)?.label ?? HAIR_STYLES[1].label;
  const color = HAIR_COLORS.find((choice) => choice.id === appearance.hairColor)?.label.toLowerCase() ?? 'negro';
  if (appearance.hairStyle === 'bald') return 'Sin cabello';
  if (species === 'Kenku' || species === 'Aarakocra') {
    const featherColor = appearance.hairColor === 'white' ? 'blancas' : appearance.hairColor === 'brown' ? 'castañas' : 'negras';
    return `${appearance.hairStyle === 'short' ? 'Cresta corta' : 'Cresta larga'} de plumas ${featherColor}`;
  }
  return `${style} ${color}`;
}

