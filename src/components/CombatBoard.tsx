// El combate visto sobre el tablero: cada combatiente es una ficha que se
// mueve, recibe golpes y se retira a la retaguardia a la vista de toda la mesa.
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import './BattleMap.css';
import MonsterPortrait from './MonsterPortrait';
import CharacterPortrait from './CharacterPortrait';
import { readAppearance } from '../lib/appearance';
import { COMBAT_EFFECT_DURATION, isFreshCombatEffect } from '../lib/combatEffects';
import { COMBAT_COLS, COMBAT_ROWS, latestAttack, layoutCombat } from '../lib/boardCombat';
import type { CharacterRow, CombatRow } from '../lib/supabase';

interface CombatBoardProps {
  combat: CombatRow;
  characters: CharacterRow[];
  /** Ilustración de la escena, como fondo del tablero. */
  art?: string;
  busy?: boolean;
  onMove?: (refId: string, x: number, y: number) => void;
}

const HERO_COLORS = ['#7b1fa2', '#1565c0', '#2e7d32', '#ef6c00', '#00838f', '#c62828'];

export default function CombatBoard({ combat, characters, art, busy = false, onMove }: CombatBoardProps) {
  const pieces = useMemo(() => layoutCombat(combat.combatants, combat.turn_index, COMBAT_COLS, COMBAT_ROWS), [combat.combatants, combat.turn_index]);
  const [selected, setSelected] = useState<string | null>(null);
  const picked = pieces.find((piece) => piece.refId === selected && !piece.away) ?? null;

  // El golpe recién guardado se ve sobre las fichas durante un momento.
  const attack = useMemo(() => latestAttack(combat), [combat]);
  const [finished, setFinished] = useState<string | null>(null);
  const attackId = attack && isFreshCombatEffect(attack) ? attack.id : null;
  useEffect(() => {
    if (!attackId) return;
    const timer = setTimeout(() => setFinished(attackId), COMBAT_EFFECT_DURATION);
    return () => clearTimeout(timer);
  }, [attackId]);
  const flash = attack && attackId && attackId !== finished ? attack : null;

  const turn = pieces.find((piece) => piece.turn);
  const heroIndex = new Map(pieces.filter((piece) => piece.kind === 'pc').map((piece, index) => [piece.refId, index]));

  return (
    <section className="enchanted-battle combat-board" aria-label="Tablero del combate">
      <div className="battle-board-plaque"><span>El frente</span><small>Ronda {combat.round}{turn ? ` · Actúa ${turn.name}` : ''}</small></div>
      <div className="battle-table-frame">
        <div className="battle-table-scroll" tabIndex={0} role="region" aria-label="Tablero del combate desplazable">
          <div className={`battle-grid ${art ? 'battle-grid-illustrated' : ''}`} style={{ '--grid-count': COMBAT_COLS, '--grid-background': '#3a3a3f', '--cell-background': '#4a4a52', backgroundImage: art ? `url("${art}")` : undefined } as CSSProperties} role="group" aria-label={`Combate, ronda ${combat.round}`}>
            {Array.from({ length: COMBAT_COLS * COMBAT_ROWS }, (_, index) => {
              const x = index % COMBAT_COLS;
              const y = Math.floor(index / COMBAT_COLS);
              const piece = pieces.find((item) => item.x === x && item.y === y);
              const isPicked = !!piece && piece.refId === picked?.refId;
              const struck = !!flash && piece?.name === flash.target;
              const striking = !!flash && piece?.name === flash.attacker;
              const state = !piece ? 'vacía' : `${piece.name}, ${piece.hp} de ${piece.max_hp} de vida${piece.away ? ', en la retaguardia' : piece.down ? ', fuera de combate' : piece.turn ? ', tiene el turno' : ''}`;
              const character = piece?.kind === 'pc' ? characters.find((item) => item.id === piece.refId) : undefined;
              return <button key={`${x}-${y}`} type="button" disabled={busy && !piece}
                className={`battle-cell ${x === 0 ? 'battle-cell-rear' : ''} ${piece ? 'battle-cell-occupied' : ''} ${isPicked ? 'battle-cell-selected' : ''} ${picked && !piece && x > 0 ? 'battle-cell-reachable' : ''}`}
                aria-pressed={isPicked} aria-label={`Casilla ${x + 1}, ${y + 1}: ${state}`} title={piece ? `${piece.name} · ${piece.hp}/${piece.max_hp} vida${piece.away ? ' · En la retaguardia' : ''}` : undefined}
                onClick={() => {
                  if (piece) { setSelected(isPicked || piece.away ? null : piece.refId); return; }
                  if (picked && onMove && x > 0) { onMove(picked.refId, x, y); setSelected(null); }
                }}>
                {piece && <span className={`battle-miniature ${piece.kind === 'enemy' ? 'battle-miniature-enemy' : 'battle-miniature-hero'} ${piece.down ? 'battle-miniature-down' : ''} ${piece.away ? 'battle-miniature-away' : ''} ${piece.turn && !piece.down && !piece.away ? 'battle-miniature-turn' : ''} ${struck ? (flash.hit ? 'battle-miniature-struck' : 'battle-miniature-dodged') : ''} ${striking ? 'battle-miniature-striking' : ''}`}
                  style={{ '--piece-accent': piece.kind === 'enemy' ? '#a13b2a' : HERO_COLORS[(heroIndex.get(piece.refId) ?? 0) % HERO_COLORS.length] } as CSSProperties}>
                  {piece.kind === 'enemy' ? <MonsterPortrait name={piece.name} className="battle-miniature-portrait" /> : character
                    ? <CharacterPortrait species={character.species} profession={character.class_name} appearance={readAppearance(character.notes)} name={character.name} compact decorative className="battle-miniature-portrait" />
                    : <span className="battle-miniature-initial" aria-hidden="true">{piece.name.charAt(0)}</span>}
                  <span className="battle-miniature-health" aria-hidden="true">{piece.hp}</span>
                  {struck && <span className="battle-hit-number" aria-hidden="true">{flash.hit ? `−${flash.damage}` : 'Falla'}</span>}
                </span>}
              </button>;
            })}
          </div>
        </div>
      </div>
      <div className="battle-board-caption">
        <span>{picked ? `Elige una casilla libre para mover a ${picked.name}.` : onMove ? 'Toca una ficha y después su destino.' : 'La mesa ve la pelea en directo.'}</span>
        <span>La columna izquierda es la retaguardia</span>
      </div>
    </section>
  );
}
