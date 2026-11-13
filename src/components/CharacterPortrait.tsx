import type { CSSProperties, ReactNode } from 'react';
import { WEAPONS } from '../lib/data';
import { DEFAULT_APPEARANCE, resolvePortraitAssets, type CharacterAppearance, type PortraitAtlasTile } from '../lib/appearance';
import './CharacterPortrait.css';

export interface CharacterPortraitProps {
  species: string;
  profession: string;
  appearance?: CharacterAppearance;
  weapon?: string | null;
  armor?: string | null;
  shield?: boolean;
  pack?: string | null;
  name?: string;
  className?: string;
  compact?: boolean;
  decorative?: boolean;
}

const artRoot = '/art/characters';
const atlasStyle = ({ file, tile }: PortraitAtlasTile): CSSProperties => ({
  backgroundImage: `url("${artRoot}/${file}")`,
  backgroundPosition: `${tile % 2 ? 100 : 0}% ${Math.floor(tile / 2) ? 100 : 0}%`,
});

function EquipmentArt({ index, label, slot }: { index: number; label: string; slot: 'weapon' | 'shield' | 'pack' }) {
  const icon = slot === 'shield' ? 'shield' : slot === 'pack' ? 'pack'
    : index >= 6 && index <= 7 ? 'bow'
      : index === 8 ? 'crossbow'
        : index === 9 ? 'spear' : index === 10 ? 'staff'
          : index === 2 ? 'axe' : index === 3 || index === 11 ? 'hammer' : index === 13 ? 'sling' : 'blade';
  const shapes: Record<string, ReactNode> = {
    blade: <><path d="m7 17 10-12 3 2L9 19l-5 2 3-4Z" /><path d="m5 17 3 3M11 14l3 3" /></>,
    axe: <><path d="m5 20 10-10" /><path d="M13 11c-2-7 2-10 8-8 1 5-1 8-6 9" /></>,
    hammer: <><path d="m6 20 10-10" /><path d="m12 6 3-3 6 6-3 3M10 8l3-3 6 6-3 3" /></>,
    bow: <><path d="M7 3c14 1 14 17 0 18M7 3v18M7 3l13 9L7 21" /></>,
    crossbow: <><path d="m6 19 12-13 3 3L8 21" /><path d="M3 12h17M4 9v6M3 12l16-1" /></>,
    spear: <><path d="m6 21 11-15" /><path d="m17 6 2-4 2 4-3 3-1-3Z" /></>,
    staff: <><path d="M6 21 18 3" /><path d="m15 4 3-3 3 2-3 3" /></>,
    sling: <><path d="m5 4 14 16M19 4 5 20M5 4l5 2M19 4l-5 2" /><circle cx="12" cy="12" r="2.3" /></>,
    shield: <><path d="M12 2 20 5v6c0 5-3.6 8.7-8 11-4.4-2.3-8-6-8-11V5l8-3Z" /><path d="m12 5 1.6 4 4.4.4-3.3 2.8 1 4.3-3.7-2.3-3.7 2.3 1-4.3L6 9.4l4.4-.4L12 5Z" /></>,
    pack: <><path d="M8 6V4a4 4 0 0 1 8 0v2M6 6h12l2 15H4L6 6Z" /><path d="M7 11h10v5H7zM9 6v5m6-5v5" /></>,
  };
  return <span className={`portrait-equipment-art portrait-equipment-${slot}`} aria-hidden="true"><svg viewBox="0 0 24 24">{shapes[icon]}</svg><span>{label}</span></span>;
}

export default function CharacterPortrait({
  species,
  profession,
  appearance = DEFAULT_APPEARANCE,
  weapon,
  armor,
  shield = false,
  pack,
  name,
  className = '',
  compact = false,
  decorative = false,
}: CharacterPortraitProps) {
  const weaponIndex = WEAPONS.findIndex((item) => item.name === weapon);
  const assets = resolvePortraitAssets(species, profession, appearance) ?? {
    head: { file: 'heads-1.webp', tile: 0 },
    costume: { file: 'costumes-1.webp', tile: 0 },
    hair: appearance.hairStyle === 'bald' ? null : { file: `hair-${appearance.hairStyle === 'short' ? '1' : '2'}.webp`, tile: appearance.hairColor === 'white' ? 0 : appearance.hairColor === 'brown' ? 1 : 2 },
  };
  const fullName = [name, species, profession, appearance.hairStyle === 'bald' ? 'sin cabello' : `${appearance.hairStyle === 'short' ? 'cabello corto' : 'cabello largo'} ${appearance.hairColor === 'white' ? 'blanco' : appearance.hairColor === 'brown' ? 'castaño' : 'negro'}`, armor, weapon, pack, shield ? 'escudo' : null]
    .filter(Boolean).join(', ');
  const accessible = decorative ? undefined : (fullName || 'Retrato de aventurero');

  const speciesClass = species.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <div className={`character-portrait portrait-species-${speciesClass} ${compact ? 'character-portrait-compact' : ''} ${className}`} role={decorative ? undefined : 'img'} aria-label={accessible} aria-hidden={decorative || undefined}>
      <div className="portrait-costume" style={atlasStyle(assets.costume)} />
      <div className="portrait-head" style={atlasStyle(assets.head)} />
      {assets.hair && <div className="portrait-hair" style={atlasStyle(assets.hair)} />}
      {!compact && weaponIndex >= 0 && <EquipmentArt index={weaponIndex} label={weapon ?? 'Arma'} slot="weapon" />}
      {!compact && shield && <EquipmentArt index={0} label="Escudo" slot="shield" />}
      {!compact && pack && <EquipmentArt index={0} label={pack} slot="pack" />}
      {!compact && armor && armor !== 'Sin armadura' && <span className="portrait-armor-tag">{armor}</span>}
      {!compact && name && <span className="portrait-name-tag">{name}</span>}
      <span className="portrait-fallback" aria-hidden="true">{species} · {profession}</span>
    </div>
  );
}
