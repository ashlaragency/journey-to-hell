// Mapa de batalla con cuadrícula para "Journey to Hell".
// Reglas de movimiento: cada casilla son 5 pies; en un turno se pueden
// mover hasta 6 casillas (30 pies). La distancia se mide con la regla de
// Chebyshev: la diagonal cuenta como una sola casilla.
import { playSound } from '../lib/audio';
import { useState, type CSSProperties } from 'react';
import './BattleMap.css';
import MonsterPortrait from './MonsterPortrait';
import CharacterPortrait from './CharacterPortrait';
import { readAppearance } from '../lib/appearance';
import {
  supabase,
  type CharacterRow,
  type MapToken,
} from '../lib/supabase';
import { LUGARES, todosLosMapas, urlMapa } from '../lib/atlas';
import CombatBoard from './CombatBoard';
import { useActiveCombat, saveCombatMove } from '../hooks/useActiveCombat';
import { useCombatActions } from '../hooks/useCombatActions';
import { COMBAT_COLS, COMBAT_ROWS, moveCombatant } from '../lib/boardCombat';

type Background = 'pergamino' | 'mazmorra' | 'bosque' | 'taberna' | 'nieve';

const BACKGROUNDS: { value: Background; label: string; gridBg: string; cellBg: string }[] = [
  { value: 'pergamino', label: 'Pergamino', gridBg: '#e8dcc0', cellBg: '#f2e9d4' },
  { value: 'mazmorra', label: 'Mazmorra', gridBg: '#3a3a3f', cellBg: '#4a4a52' },
  { value: 'bosque', label: 'Bosque', gridBg: '#2e5d34', cellBg: '#3a7040' },
  { value: 'taberna', label: 'Taberna', gridBg: '#6d4c41', cellBg: '#7d5a4d' },
  { value: 'nieve', label: 'Nieve', gridBg: '#cfdde8', cellBg: '#eef4f7' },
];

const GRID_SIZES = [8, 12, 16, 20] as const;

interface EnemyPreset {
  name: string;
  hp: number;
  color: string;
}

// Vida tomada del compendio (MONSTERS) para que coincida con las fichas.
const ENEMY_PRESETS: EnemyPreset[] = [
  { name: 'Goblin', hp: 7, color: '#4caf50' },
  { name: 'Orco', hp: 15, color: '#795548' },
  { name: 'Esqueleto', hp: 13, color: '#bdbdbd' },
  { name: 'Lobo', hp: 11, color: '#78909c' },
  { name: 'Bandido', hp: 11, color: '#5c6bc0' },
  { name: 'Ogro', hp: 59, color: '#a1887f' },
];

function MapIcon({ kind }: { kind: 'settings' | 'save' | 'clear' | 'measure' | 'person' | 'enemy' | 'pieces' | 'close' | 'move' }) {
  const paths = {
    settings: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
    save: 'M4 3h13l4 4v14H3V3h1Zm3 0v6h10V3M7 21v-8h10v8',
    clear: 'M4 7h16M9 7V3h6v4M6 7l1 14h10l1-14M10 11v6m4-6v6',
    measure: 'm3 16 13-13 5 5L8 21l-5-5Zm10-10 3 3m-6 0 2 2m-5 1 3 3m-6 0 2 2',
    person: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m10-3v6m-3-3h6',
    enemy: 'm4 3 5 4h6l5-4-2 10-6 8-6-8L4 3Zm4 8h1m6 0h1m-7 5h6',
    pieces: 'M9 3h6l-1 5 3 6v4H7v-4l3-6-1-5ZM5 21h14M7 18h10M10 8h4',
    close: 'm6 6 12 12M6 18 18 6',
    move: 'M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3',
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>;
}

const PC_COLORS = ['#7b1fa2', '#1565c0', '#c62828', '#2e7d32', '#ef6c00', '#00838f'];

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `t-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function shortName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return first.length > 10 ? `${first.slice(0, 9)}…` : first;
}

interface BattleMapProps {
  worldId: string | null;
  characters: CharacterRow[];
  schemaOk: boolean;
  playerName: string;
  onCharactersChange: () => void;
  /** Mapa del atlas abierto desde la pestaña Atlas (o null para cuadrícula de colores). */
  mapaInicial?: { slug: string; nombre: string } | null;
}

export default function BattleMap({ worldId, characters, schemaOk, playerName, onCharactersChange, mapaInicial }: BattleMapProps) {
  const [combat, setCombat] = useActiveCombat(worldId, schemaOk);
  const [moving, setMoving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const actions = useCombatActions({
    combat, setCombat, worldId, schemaOk, playerName, characters,
    onCharactersChange, setResult: setNotice,
  });
  async function moveInCombat(refId: string, x: number, y: number) {
    if (!combat || moving) return;
    const next = moveCombatant(combat, refId, x, y, COMBAT_COLS, COMBAT_ROWS);
    if (!next) return;
    setMoving(true);
    const saved = await saveCombatMove(combat, next);
    setMoving(false);
    if (saved) { setCombat(saved); playSound('move'); }
    else setNotice('La mesa cambió mientras movías la ficha. Vuelve a intentarlo.');
  }
  const [gridSize, setGridSize] = useState<number>(12);
  const [background, setBackground] = useState<Background>('pergamino');
  const [atlasMap, setAtlasMap] = useState<string | null>(mapaInicial?.slug ?? null);
  const [mapName, setMapName] = useState(mapaInicial?.nombre ?? 'Mapa 1');
  const [tokens, setTokens] = useState<MapToken[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddCharacter, setShowAddCharacter] = useState(false);
  const [showAddEnemy, setShowAddEnemy] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<{ x: number; y: number }[]>([]);
  const [saving, setSaving] = useState(false);

  const bg = BACKGROUNDS.find((b) => b.value === background) ?? BACKGROUNDS[0];
  const livingCharacters = characters.filter((c) => c.status === 'vivo');
  const selectedToken = tokens.find((t) => t.id === selectedId) ?? null;

  function characterForToken(token: MapToken | null) {
    if (!token?.id.startsWith('pc-')) return undefined;
    return characters.find((character) => character.id === token.id.slice(3));
  }

  function tokenAt(x: number, y: number): MapToken | undefined {
    return tokens.find((t) => t.x === x && t.y === y);
  }

  function firstFreeCell(): { x: number; y: number } | null {
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (!tokenAt(x, y)) return { x, y };
      }
    }
    return null;
  }

  function addToken(token: MapToken) {
    const cell = firstFreeCell();
    if (!cell) {
      setNotice('El mapa está lleno: no queda ninguna casilla libre.');
      playSound('failure');
      return;
    }
    setTokens((prev) => [...prev, { ...token, x: cell.x, y: cell.y }]);
    setSelectedId(token.id);
    setNotice(null);
    playSound('select');
  }

  function addCharacter(character: CharacterRow) {
    const id = `pc-${character.id}`;
    if (tokens.some((t) => t.id === id)) {
      setNotice(`${character.name} ya está en el mapa.`);
      playSound('failure');
      return;
    }
    const icon = character.name.charAt(0).toUpperCase();
    const color =
      PC_COLORS[tokens.filter((t) => t.id.startsWith('pc-')).length % PC_COLORS.length];
    addToken({
      id,
      name: character.name,
      x: 0,
      y: 0,
      color,
      hp: character.hp,
      max_hp: character.max_hp,
      icon,
    });
    setShowAddCharacter(false);
  }

  function addEnemy(preset: EnemyPreset) {
    const count = tokens.filter((t) => t.name === preset.name).length;
    addToken({
      id: `enemy-${newId()}`,
      name: count > 0 ? `${preset.name} ${count + 1}` : preset.name,
      x: 0,
      y: 0,
      color: preset.color,
      hp: preset.hp,
      max_hp: preset.hp,
      icon: preset.name,
    });
    setShowAddEnemy(false);
  }

  function handleCellClick(x: number, y: number) {
    if (measuring) {
      const next = [...measurePoints, { x, y }].slice(-2);
      setMeasurePoints(next);
      setNotice(null);
      return;
    }

    const token = tokenAt(x, y);
    if (token) {
      setSelectedId(token.id);
      setNotice(null);
      playSound('select');
      return;
    }

    if (selectedToken) {
      // Mover la ficha seleccionada a una casilla libre.
      const distance = Math.max(
        Math.abs(x - selectedToken.x),
        Math.abs(y - selectedToken.y),
      );
      setTokens((prev) =>
        prev.map((t) => (t.id === selectedToken.id ? { ...t, x, y } : t)),
      );
      playSound('move');
      if (distance > 6) {
        setNotice(
          `Eso es más de lo que puede moverse en un turno (30 pies): moviste ${distance} casillas (${distance * 5} pies).`,
        );
      } else {
        setNotice(
          `${selectedToken.name} se movió ${distance} casilla${distance === 1 ? '' : 's'} (${distance * 5} pies).`,
        );
      }
    }
  }

  async function changeHp(delta: number) {
    if (!selectedToken) return;
    const tokenId = selectedToken.id;
    const newHp = Math.max(0, Math.min(selectedToken.max_hp, selectedToken.hp + delta));
    if (newHp === selectedToken.hp) return;
    if (tokenId.startsWith('pc-')) {
      const characterId = tokenId.slice(3);
      const character = characters.find((item) => item.id === characterId);
      if (!character || character.status !== 'vivo') {
        setNotice('Esta hoja está sellada. Su vida ya no se puede cambiar.');
        return;
      }
      if (!schemaOk || !worldId) {
        setNotice('Recupera la conexión antes de cambiar la vida de un personaje.');
        return;
      }
      const { error } = await supabase.from('characters').update({ hp: newHp })
        .eq('id', characterId).eq('world_id', worldId).eq('status', 'vivo')
        .eq('hp', character.hp).select('id').single();
      if (error) {
        setNotice('No se pudo guardar la vida. Revisa la hoja actualizada antes de intentarlo de nuevo.');
        return;
      }
    }
    setTokens((previous) => previous.map((token) => token.id === tokenId ? { ...token, hp: newHp } : token));
  }

  function removeSelectedToken() {
    if (!selectedToken) return;
    setTokens((prev) => prev.filter((t) => t.id !== selectedToken.id));
    setSelectedId(null);
  }

  function clearMap() {
    setTokens([]);
    setSelectedId(null);
    setMeasurePoints([]);
    setNotice(null);
  }

  async function saveMap() {
    if (!schemaOk) {
      setNotice('No se puede guardar ahora. Revisa la conexión con el mundo y vuelve a intentarlo.');
      playSound('failure');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('battle_maps').insert({
      world_id: worldId,
      name: mapName.trim() || 'Mapa 1',
      grid_size: gridSize,
      background,
      tokens,
    });
    setSaving(false);
    if (error) {
      setNotice(`No se pudo guardar el mapa: ${error.message}`);
      playSound('failure');
    } else {
      playSound('success');
      setNotice(`Mapa "${mapName.trim() || 'Mapa 1'}" guardado con ${tokens.length} ficha${tokens.length === 1 ? '' : 's'}.`);
    }
  }

  // Distancia con la regla de Chebyshev: la diagonal cuenta como 1 casilla.
  const measureText =
    measurePoints.length === 2
      ? (() => {
          const [a, b] = measurePoints;
          const cells = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
          return `Distancia: ${cells} casilla${cells === 1 ? '' : 's'} = ${cells * 5} pies`;
        })()
      : null;

  return (
    <div className="battle-map enchanted-battle">
      <header className="battle-heading">
        <div><p className="battle-eyebrow">Despliega la aventura</p><h2>Mesa de batalla</h2></div>
        <span className="battle-piece-count"><MapIcon kind="pieces" />{tokens.length} fichas en juego</span>
      </header>

      {combat && <>
        <div className="battle-live-combat" role="status">
          <p><strong>Hay un combate en curso.</strong><small>Ronda {combat.round} · Actúa {combat.combatants[combat.turn_index % combat.combatants.length]?.name ?? 'la compañía'}. Los golpes y los movimientos se ven aquí en directo.</small></p>
        </div>
        <CombatBoard combat={combat} characters={characters} art={atlasMap ? urlMapa(atlasMap) : undefined} busy={moving || actions.pending}
          onMove={(refId, x, y) => void moveInCombat(refId, x, y)}
          onAttack={(attackerRefId, targetRefId) => void actions.runAction(() => actions.pcAttack(targetRefId, attackerRefId))}
          onEnemyAttack={(enemyRefId) => void actions.runAction(() => actions.enemyAttack(enemyRefId))} />
      </>}

      <div className="battle-tools">
        <details className="battle-setup">
          <summary><MapIcon kind="settings" />Preparar tablero<span aria-hidden="true">⌄</span></summary>
          <div className="battle-setup-fields">
            <label>Tamaño de la cuadrícula
              <select aria-label="Tamaño de la cuadrícula" value={gridSize} onChange={(event) => {
                const size = Number(event.target.value);
                setGridSize(size);
                setTokens((previous) => previous.filter((token) => token.x < size && token.y < size));
                setMeasurePoints([]);
              }}>
                {GRID_SIZES.map((size) => <option key={size} value={size}>{size} × {size}</option>)}
              </select>
            </label>
            <label>Material del tablero
              <select aria-label="Material del tablero" value={background} onChange={(event) => setBackground(event.target.value as Background)}>
                {BACKGROUNDS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="battle-map-picker">Mapa del Atlas
              <select aria-label="Mapa del Atlas" value={atlasMap ?? ''} onChange={(event) => {
                const slug = event.target.value || null;
                setAtlasMap(slug);
                if (slug) {
                  const map = todosLosMapas().find((item) => item.slug === slug);
                  if (map) setMapName((previous) => previous === 'Mapa 1' || previous.trim() === '' ? map.nombre : previous);
                }
              }}>
                <option value="">Tablero sin ilustración</option>
                {LUGARES.filter((place) => place.mapas.length > 0).map((place) => <optgroup key={place.id} label={`${place.nombre} · ${place.zona}`}>
                  {place.mapas.map((map) => <option key={map.slug} value={map.slug}>{map.nombre}</option>)}
                </optgroup>)}
              </select>
            </label>
            <label>Nombre del mapa
              <input aria-label="Nombre del mapa" type="text" value={mapName} onChange={(event) => setMapName(event.target.value)} placeholder="Mapa 1" />
            </label>
            <button type="button" className="btn battle-clear" onClick={clearMap}><MapIcon kind="clear" />Limpiar mapa</button>
          </div>
        </details>
        <div className="battle-primary-tools">
          <button type="button" className="btn" aria-expanded={showAddCharacter} aria-controls={showAddCharacter ? 'battle-character-choices' : undefined} onClick={() => {
            setShowAddCharacter((value) => !value);
            setShowAddEnemy(false);
          }}><MapIcon kind="person" />Añadir personaje vivo</button>
          <button type="button" className="btn" aria-expanded={showAddEnemy} aria-controls={showAddEnemy ? 'battle-enemy-choices' : undefined} onClick={() => {
            setShowAddEnemy((value) => !value);
            setShowAddCharacter(false);
          }}><MapIcon kind="enemy" />Añadir enemigo</button>
          <button type="button" className={`btn ${measuring ? 'chip-selected' : ''}`} aria-pressed={measuring} onClick={() => {
            setMeasuring((value) => !value);
            setMeasurePoints([]);
            setNotice(null);
          }}><MapIcon kind="measure" />Medir</button>
          <button type="button" className="btn btn-primary battle-save" onClick={saveMap} disabled={saving}><MapIcon kind="save" />{saving ? 'Guardando…' : 'Guardar mapa'}</button>
        </div>
      </div>

      {!schemaOk && <p className="battle-notice" role="status">No hay conexión con el mundo. Puedes preparar el tablero, pero todavía no se podrá guardar.</p>}

      {showAddCharacter && <section id="battle-character-choices" className="battle-piece-picker" aria-label="Personajes para el tablero">
        <p className="battle-eyebrow">Elige quién entra en la mesa</p>
        {livingCharacters.length === 0 ? <p>No hay personajes vivos todavía.</p> : <div className="battle-character-choices">
          {livingCharacters.map((character) => <button key={character.id} type="button" className="battle-character-choice" onClick={() => addCharacter(character)}>
            <CharacterPortrait species={character.species} profession={character.class_name} appearance={readAppearance(character.notes)} name={character.name} compact decorative className="battle-avatar" />
            <span><strong>{character.name}</strong><small>{character.class_name} · {character.hp}/{character.max_hp} vida</small></span>
            <span className="battle-add-mark" aria-hidden="true">+</span>
          </button>)}
        </div>}
      </section>}

      {showAddEnemy && <section id="battle-enemy-choices" className="battle-piece-picker" aria-label="Enemigos para el tablero">
        <p className="battle-eyebrow">Una nueva presencia en el tablero</p>
        <div className="enemy-choices">
          {ENEMY_PRESETS.map((preset) => <button key={preset.name} type="button" className="enemy-choice" onClick={() => addEnemy(preset)}>
            <MonsterPortrait name={preset.name} />
            <span><strong>{preset.name}</strong><small>{preset.hp} vida</small></span>
          </button>)}
        </div>
      </section>}

      {measuring && <p className="battle-notice battle-measure-notice" role="status"><MapIcon kind="measure" />{measureText ? `${measureText}.` : 'Toca dos casillas para medir la distancia.'} Cada casilla son 5 pies, también en diagonal.</p>}
      {notice && <p className="battle-notice" role="status">{notice}</p>}

      <div className="battle-table-layout">
        <section className="battle-board" aria-label="Tablero de juego">
          <div className="battle-board-plaque"><span>{atlasMap ? todosLosMapas().find((map) => map.slug === atlasMap)?.nombre ?? mapName : mapName}</span><small>{gridSize} × {gridSize} casillas</small></div>
          <div className="battle-table-frame">
            <span className="battle-table-stud stud-nw" aria-hidden="true" /><span className="battle-table-stud stud-ne" aria-hidden="true" />
            <span className="battle-table-stud stud-sw" aria-hidden="true" /><span className="battle-table-stud stud-se" aria-hidden="true" />
            <div className="battle-table-scroll" tabIndex={0} role="region" aria-label="Tablero desplazable. Usa las flechas para recorrerlo.">
              <div className={`battle-grid ${atlasMap ? 'battle-grid-illustrated' : ''}`} style={{
                '--grid-count': gridSize,
                '--grid-background': bg.gridBg,
                '--cell-background': bg.cellBg,
                backgroundImage: atlasMap ? `url("${urlMapa(atlasMap)}")` : undefined,
              } as CSSProperties} role="group" aria-label={`Mapa de batalla de ${gridSize} por ${gridSize} casillas`}>
                {Array.from({ length: gridSize * gridSize }, (_, index) => {
                  const x = index % gridSize;
                  const y = Math.floor(index / gridSize);
                  const token = tokenAt(x, y);
                  const isSelected = token?.id === selectedId;
                  const isMeasurePoint = measurePoints.some((point) => point.x === x && point.y === y);
                  return <button key={`${x}-${y}`} type="button" className={`battle-cell ${token ? 'battle-cell-occupied' : ''} ${isSelected ? 'battle-cell-selected' : ''} ${isMeasurePoint ? 'battle-cell-measured' : ''}`}
                    onClick={() => handleCellClick(x, y)} aria-pressed={isSelected || isMeasurePoint}
                    title={token ? `${token.name} · ${token.hp}/${token.max_hp} vida` : undefined}
                    aria-label={token ? `Casilla ${x + 1}, ${y + 1}: ${token.name}, ${token.hp} de ${token.max_hp} de vida` : `Casilla ${x + 1}, ${y + 1}: vacía`}>
                    {token && <span className={`battle-miniature ${token.id.startsWith('enemy-') ? 'battle-miniature-enemy' : 'battle-miniature-hero'} ${token.hp <= 0 ? 'battle-miniature-down' : ''}`} style={{ '--piece-accent': token.color } as CSSProperties}>
                      {token.id.startsWith('enemy-') ? <MonsterPortrait name={token.name} className="battle-miniature-portrait" /> : (() => {
                        const character = characterForToken(token);
                        return character
                          ? <CharacterPortrait species={character.species} profession={character.class_name} appearance={readAppearance(character.notes)} name={character.name} compact decorative className="battle-miniature-portrait" />
                          : <span className="battle-miniature-initial" aria-hidden="true">{token.name.charAt(0)}</span>;
                      })()}
                      <span className="battle-miniature-health" aria-hidden="true">{token.hp}</span>
                    </span>}
                    {isMeasurePoint && !token && <span className="battle-measure-pin" aria-hidden="true">{measurePoints.findIndex((point) => point.x === x && point.y === y) + 1}</span>}
                  </button>;
                })}
              </div>
            </div>
          </div>
          <div className="battle-board-caption"><span><MapIcon kind="move" />Toca una ficha y después su destino.</span><span>1 casilla = 5 pies · Hasta 6 por turno</span></div>
        </section>

        <aside className="battle-selection" aria-label="Ficha seleccionada">
          {selectedToken ? <>
            <p className="battle-eyebrow">Tu siguiente movimiento</p>
            <div className="selected-token-heading">
              {selectedToken.id.startsWith('enemy-') ? <MonsterPortrait name={selectedToken.name} /> : (() => {
                const character = characterForToken(selectedToken);
                return character
                  ? <CharacterPortrait species={character.species} profession={character.class_name} appearance={readAppearance(character.notes)} name={character.name} compact decorative className="battle-avatar battle-avatar-large" />
                  : <span className="battle-avatar battle-avatar-large" aria-hidden="true">{selectedToken.name.charAt(0)}</span>;
              })()}
              <div><strong>{selectedToken.name}</strong><small>Casilla {selectedToken.x + 1}, {selectedToken.y + 1}</small></div>
            </div>
            <div className="battle-vitals"><span>Vida</span><b>{selectedToken.hp}<small> / {selectedToken.max_hp}</small></b></div>
            <div className="battle-hp-meter" role="meter" aria-label={`Vida de ${selectedToken.name}`} aria-valuemin={0} aria-valuemax={selectedToken.max_hp} aria-valuenow={selectedToken.hp}><span style={{ width: `${selectedToken.max_hp > 0 ? Math.max(0, Math.min(100, selectedToken.hp / selectedToken.max_hp * 100)) : 0}%` }} /></div>
            {selectedToken.hp === 0 && <p className="battle-at-zero">A 0 de vida.</p>}
            <div className="battle-hp-controls" aria-label="Ajustar vida de la ficha">
              {[-5, -1, 1, 5].map((delta) => <button key={delta} type="button" className="btn" aria-label={`${delta < 0 ? 'Quitar' : 'Sumar'} ${Math.abs(delta)} de vida a ${selectedToken.name}`} onClick={() => changeHp(delta)}>{delta > 0 ? '+' : '−'}{Math.abs(delta)}</button>)}
            </div>
            {selectedToken.id.startsWith('pc-') && <p className="battle-selection-hint">La vida también se guarda en la hoja del personaje.</p>}
            <p className="battle-move-hint"><MapIcon kind="move" />Elige una casilla libre para mover a {shortName(selectedToken.name)}.</p>
            <div className="battle-selection-actions">
              <button type="button" className="btn" onClick={() => setSelectedId(null)}><MapIcon kind="close" />Deseleccionar</button>
              <button type="button" className="battle-remove" onClick={removeSelectedToken}><MapIcon kind="clear" />Quitar ficha del tablero</button>
            </div>
          </> : <div className="battle-empty-selection"><span className="battle-empty-seal" aria-hidden="true"><MapIcon kind="pieces" /></span><p className="battle-eyebrow">La mesa está preparada</p><h3>{tokens.length ? 'Elige tu próxima jugada' : 'Da vida al tablero'}</h3><p>{tokens.length ? 'Selecciona una ficha para moverla y consultar su vida.' : 'Añade a tu compañía y a sus enemigos con los controles de arriba.'}</p><span className="battle-empty-rule" aria-hidden="true">◇</span><small>{livingCharacters.length} personajes vivos en el mundo</small></div>}
        </aside>
      </div>
    </div>
  );
}
