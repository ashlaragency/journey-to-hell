// Mapa de batalla con cuadrícula para "Journey to Hell".
// Reglas de movimiento: cada casilla son 5 pies; en un turno se pueden
// mover hasta 6 casillas (30 pies). La distancia se mide con la regla de
// Chebyshev: la diagonal cuenta como una sola casilla.
import { useEffect, useState } from 'react';
import {
  supabase,
  type CharacterRow,
  type MapToken,
} from '../lib/supabase';
import { LUGARES, todosLosMapas, urlMapa } from '../lib/atlas';

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
  icon: string;
}

// Vida tomada del compendio (MONSTERS) para que coincida con las fichas.
const ENEMY_PRESETS: EnemyPreset[] = [
  { name: 'Goblin', hp: 7, color: '#4caf50', icon: '👺' },
  { name: 'Orco', hp: 15, color: '#795548', icon: '👹' },
  { name: 'Esqueleto', hp: 13, color: '#bdbdbd', icon: '💀' },
  { name: 'Lobo', hp: 11, color: '#78909c', icon: '🐺' },
  { name: 'Bandido', hp: 11, color: '#5c6bc0', icon: '🗡️' },
  { name: 'Ogro', hp: 59, color: '#a1887f', icon: '🧌' },
];

const CLASS_ICONS: Record<string, string> = {
  guerrero: '⚔️',
  mago: '🧙',
  pícaro: '🗡️',
  clérigo: '⛪',
  bardo: '🎵',
  druida: '🌿',
  paladín: '🛡️',
  explorador: '🏹',
  hechicero: '✨',
  brujo: '🔮',
  bárbaro: '🪓',
  monje: '🥋',
  artífice: '⚙️',
};

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
  /** Mapa del atlas abierto desde la pestaña Atlas (o null para cuadrícula de colores). */
  mapaInicial?: { slug: string; nombre: string } | null;
}

export default function BattleMap({ worldId, characters, schemaOk, mapaInicial }: BattleMapProps) {
  const [gridSize, setGridSize] = useState<number>(12);
  const [background, setBackground] = useState<Background>('pergamino');
  const [atlasMap, setAtlasMap] = useState<string | null>(mapaInicial?.slug ?? null);
  const [mapName, setMapName] = useState('Mapa 1');
  const [tokens, setTokens] = useState<MapToken[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddCharacter, setShowAddCharacter] = useState(false);
  const [showAddEnemy, setShowAddEnemy] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<{ x: number; y: number }[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Cuando el Atlas abre un mapa aquí, se pone como fondo de la cuadrícula.
  useEffect(() => {
    if (mapaInicial) {
      setAtlasMap(mapaInicial.slug);
      setMapName((prev) => (prev === 'Mapa 1' || prev.trim() === '' ? mapaInicial.nombre : prev));
    }
  }, [mapaInicial]);

  const bg = BACKGROUNDS.find((b) => b.value === background) ?? BACKGROUNDS[0];
  const livingCharacters = characters.filter((c) => c.status === 'vivo');
  const selectedToken = tokens.find((t) => t.id === selectedId) ?? null;

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
      setNotice('⚠️ El mapa está lleno: no queda ninguna casilla libre.');
      return;
    }
    setTokens((prev) => [...prev, { ...token, x: cell.x, y: cell.y }]);
    setSelectedId(token.id);
    setNotice(null);
  }

  function addCharacter(character: CharacterRow) {
    const id = `pc-${character.id}`;
    if (tokens.some((t) => t.id === id)) {
      setNotice(`⚠️ ${character.name} ya está en el mapa.`);
      return;
    }
    const icon =
      CLASS_ICONS[character.class_name.trim().toLowerCase()] ?? '🧑';
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
      icon: preset.icon,
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
      if (distance > 6) {
        setNotice(
          `⚠️ Eso es más de lo que puede moverse en un turno (30 pies): moviste ${distance} casillas (${distance * 5} pies).`,
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
    const newHp = Math.max(0, Math.min(selectedToken.max_hp, selectedToken.hp + delta));
    if (newHp === selectedToken.hp) return;

    setTokens((prev) =>
      prev.map((t) => (t.id === selectedToken.id ? { ...t, hp: newHp } : t)),
    );

    // Si es un personaje jugador, su vida también cambia en la tabla characters.
    if (selectedToken.id.startsWith('pc-')) {
      const characterId = selectedToken.id.slice(3);
      const { error } = await supabase
        .from('characters')
        .update({ hp: newHp })
        .eq('id', characterId);
      if (error) {
        setNotice(`⚠️ La vida cambió en el mapa, pero no se pudo guardar en el personaje: ${error.message}`);
      }
    }
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
      setNotice('⚠️ No se puede guardar: las tablas de Supabase aún no están listas (falta aplicar el SQL).');
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
      setNotice(`⚠️ No se pudo guardar el mapa: ${error.message}`);
    } else {
      setNotice(`✅ Mapa "${mapName.trim() || 'Mapa 1'}" guardado con ${tokens.length} ficha${tokens.length === 1 ? '' : 's'}.`);
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
    <div className="card">
      <h2>🗺️ Mapa de batalla</h2>
      <p>
        Cada casilla son 5 pies. En un turno puedes moverte hasta 6 casillas
        (30 pies). Toca una ficha para seleccionarla y luego toca una casilla
        para moverla.
      </p>

      {atlasMap && (
        <p className="hint">
          🖼️ Fondo: imagen del atlas (16:9). La cuadrícula va encima y las
          fichas se mueven igual. Sin imagen, el mapa usa la cuadrícula de
          colores.
        </p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <label>
          Tamaño:{' '}
          <select
            value={gridSize}
            onChange={(e) => {
              const size = Number(e.target.value);
              setGridSize(size);
              // Quita las fichas que queden fuera del mapa más pequeño.
              setTokens((prev) => prev.filter((t) => t.x < size && t.y < size));
              setMeasurePoints([]);
            }}
          >
            {GRID_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} × {size}
              </option>
            ))}
          </select>
        </label>

        <label>
          Fondo:{' '}
          <select
            value={background}
            onChange={(e) => setBackground(e.target.value as Background)}
          >
            {BACKGROUNDS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Mapa del atlas:{' '}
          <select
            value={atlasMap ?? ''}
            onChange={(e) => {
              const slug = e.target.value || null;
              setAtlasMap(slug);
              if (slug) {
                const m = todosLosMapas().find((mm) => mm.slug === slug);
                if (m) {
                  setMapName((prev) => (prev === 'Mapa 1' || prev.trim() === '' ? m.nombre : prev));
                }
              }
            }}
          >
            <option value="">Cuadrícula de colores (sin imagen)</option>
            {LUGARES.filter((l) => l.mapas.length > 0).map((l) => (
              <optgroup key={l.id} label={`${l.nombre} · ${l.zona}`}>
                {l.mapas.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.nombre}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label>
          Nombre:{' '}
          <input
            type="text"
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            placeholder="Mapa 1"
            style={{ maxWidth: '10rem' }}
          />
        </label>

        <button
          type="button"
          className="btn btn-primary"
          onClick={saveMap}
          disabled={saving}
        >
          {saving ? 'Guardando…' : '💾 Guardar mapa'}
        </button>
        <button type="button" className="btn" onClick={clearMap}>
          🧹 Limpiar mapa
        </button>
      </div>

      {!schemaOk && (
        <p>
          ⚠️ Las tablas de Supabase aún no están listas: puedes mover fichas en
          el mapa, pero no se podrá guardar.
        </p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setShowAddCharacter((v) => !v);
            setShowAddEnemy(false);
          }}
        >
          ➕ Añadir personaje vivo
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setShowAddEnemy((v) => !v);
            setShowAddCharacter(false);
          }}
        >
          👺 Añadir enemigo
        </button>
        <button
          type="button"
          className={measuring ? 'btn chip-selected' : 'btn'}
          onClick={() => {
            setMeasuring((v) => !v);
            setMeasurePoints([]);
            setNotice(null);
          }}
        >
          📏 Medir
        </button>
      </div>

      {showAddCharacter && (
        <div style={{ marginTop: '0.75rem' }}>
          <p>Toca un personaje para añadirlo al mapa:</p>
          {livingCharacters.length === 0 ? (
            <p>No hay personajes vivos todavía.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {livingCharacters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="chip"
                  onClick={() => addCharacter(c)}
                >
                  {CLASS_ICONS[c.class_name.trim().toLowerCase()] ?? '🧑'} {c.name}{' '}
                  ({c.hp}/{c.max_hp} PV)
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddEnemy && (
        <div style={{ marginTop: '0.75rem' }}>
          <p>Toca un enemigo para añadirlo al mapa:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {ENEMY_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="chip"
                onClick={() => addEnemy(preset)}
              >
                {preset.icon} {preset.name} ({preset.hp} PV)
              </button>
            ))}
          </div>
        </div>
      )}

      {measuring && (
        <p>
          📏 Modo medir: toca dos casillas. La distancia se mide con la regla
          de Chebyshev: moverse en diagonal cuenta como una sola casilla
          (igual que en horizontal o vertical), y cada casilla son 5 pies.
          {measureText ? ` ${measureText}.` : ' Toca la primera casilla.'}
        </p>
      )}

      {notice && <p>{notice}</p>}

      {selectedToken && (
        <div className="card" style={{ marginTop: '0.75rem' }}>
          <strong>
            {selectedToken.icon} {selectedToken.name}
          </strong>
          <div
            style={{
              height: '10px',
              borderRadius: '5px',
              background: '#ddd',
              overflow: 'hidden',
              margin: '0.5rem 0',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${selectedToken.max_hp > 0 ? (selectedToken.hp / selectedToken.max_hp) * 100 : 0}%`,
                background: selectedToken.hp === 0 ? '#c62828' : '#2e7d32',
              }}
            />
          </div>
          <p>
            Vida: {selectedToken.hp} / {selectedToken.max_hp} PV
            {selectedToken.hp === 0 ? ' · ¡Caído!' : ''}
            {selectedToken.id.startsWith('pc-') &&
              ' · los cambios también se guardan en su personaje.'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button type="button" className="btn" onClick={() => changeHp(-5)}>
              −5
            </button>
            <button type="button" className="btn" onClick={() => changeHp(-1)}>
              −1
            </button>
            <button type="button" className="btn" onClick={() => changeHp(1)}>
              +1
            </button>
            <button type="button" className="btn" onClick={() => changeHp(5)}>
              +5
            </button>
            <button type="button" className="btn" onClick={removeSelectedToken}>
              🗑️ Quitar ficha
            </button>
            <button type="button" className="btn" onClick={() => setSelectedId(null)}>
              ✖️ Deseleccionar
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gap: '2px',
          background: atlasMap ? '#17100a' : bg.gridBg,
          backgroundImage: atlasMap ? `url(${urlMapa(atlasMap)})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '4px',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '640px',
          marginTop: '1rem',
        }}
        role="grid"
        aria-label={`Mapa de batalla de ${gridSize} por ${gridSize} casillas`}
      >
        {Array.from({ length: gridSize * gridSize }, (_, i) => {
          const x = i % gridSize;
          const y = Math.floor(i / gridSize);
          const token = tokenAt(x, y);
          const isSelected = token?.id === selectedId;
          const isMeasurePoint = measurePoints.some((p) => p.x === x && p.y === y);
          return (
            <button
              key={`${x}-${y}`}
              type="button"
              onClick={() => handleCellClick(x, y)}
              aria-label={
                token
                  ? `Casilla ${x + 1}, ${y + 1}: ${token.name}`
                  : `Casilla ${x + 1}, ${y + 1}: vacía`
              }
              style={{
                aspectRatio: '1 / 1',
                padding: 0,
                border: isSelected
                  ? '3px solid gold'
                  : isMeasurePoint
                    ? '3px solid #1565c0'
                    : atlasMap
                      ? '1px solid rgba(255,255,255,0.4)'
                      : '1px solid rgba(0,0,0,0.15)',
                borderRadius: '4px',
                background: token ? token.color : atlasMap ? 'rgba(10, 8, 6, 0.28)' : bg.cellBg,
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: gridSize > 12 ? '0.65rem' : '0.8rem',
                lineHeight: 1.1,
                overflow: 'hidden',
              }}
            >
              {token && (
                <>
                  <span style={{ fontSize: gridSize > 12 ? '1rem' : '1.25rem' }}>
                    {token.icon}
                  </span>
                  <span style={{ fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                    {shortName(token.name)}
                  </span>
                  <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                    {token.hp}/{token.max_hp}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <p>
        Fichas en el mapa: {tokens.length} · Personajes vivos:{' '}
        {livingCharacters.length}
      </p>
    </div>
  );
}
