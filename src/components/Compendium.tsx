// Compendio buscable para "Journey to Hell": monstruos, hechizos,
// condiciones y acciones de combate, todo en español.
import { useMemo, useState } from 'react';
import {
  MONSTERS,
  SPELLS,
  CONDITIONS,
  COMBAT_ACTIONS,
} from '../lib/compendium';

type Tab = 'monstruos' | 'hechizos' | 'condiciones' | 'acciones';

const TABS: { value: Tab; label: string }[] = [
  { value: 'monstruos', label: '👹 Monstruos' },
  { value: 'hechizos', label: '✨ Hechizos' },
  { value: 'condiciones', label: '😵 Condiciones' },
  { value: 'acciones', label: '⚔️ Acciones de combate' },
];

const SPELL_LEVELS = [0, 1, 2, 3] as const;

// Quita acentos para que buscar "dragon" encuentre "dragón".
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function Compendium() {
  const [tab, setTab] = useState<Tab>('monstruos');
  const [query, setQuery] = useState('');
  const [monsterType, setMonsterType] = useState('todos');
  const [spellLevel, setSpellLevel] = useState('todos');
  const [spellSchool, setSpellSchool] = useState('todos');

  const monsterTypes = useMemo(
    () => [...new Set(MONSTERS.map((m) => m.type))].sort((a, b) => a.localeCompare(b, 'es')),
    [],
  );

  const spellSchools = useMemo(
    () => [...new Set(SPELLS.map((s) => s.school))].sort((a, b) => a.localeCompare(b, 'es')),
    [],
  );

  const filteredMonsters = useMemo(() => {
    const q = normalize(query.trim());
    return MONSTERS.filter(
      (m) =>
        (monsterType === 'todos' || m.type === monsterType) &&
        (q === '' || normalize(m.name).includes(q)),
    );
  }, [query, monsterType]);

  const filteredSpells = useMemo(() => {
    const q = normalize(query.trim());
    return SPELLS.filter(
      (s) =>
        (spellLevel === 'todos' || s.level === Number(spellLevel)) &&
        (spellSchool === 'todos' || s.school === spellSchool) &&
        (q === '' || normalize(s.name).includes(q)),
    );
  }, [query, spellLevel, spellSchool]);

  const filteredConditions = useMemo(() => {
    const q = normalize(query.trim());
    return CONDITIONS.filter((c) => q === '' || normalize(c.name).includes(q));
  }, [query]);

  const filteredActions = useMemo(() => {
    const q = normalize(query.trim());
    return COMBAT_ACTIONS.filter((a) => q === '' || normalize(a.name).includes(q));
  }, [query]);

  const resultCount =
    tab === 'monstruos'
      ? filteredMonsters.length
      : tab === 'hechizos'
        ? filteredSpells.length
        : tab === 'condiciones'
          ? filteredConditions.length
          : filteredActions.length;

  return (
    <div className="card">
      <h2>📖 Compendio</h2>
      <p>Monstruos, hechizos, condiciones y acciones de combate, en español.</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            className={tab === t.value ? 'chip chip-selected' : 'chip'}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          alignItems: 'center',
          marginTop: '0.75rem',
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Buscar por nombre…"
          aria-label="Buscar por nombre"
          style={{ flex: '1 1 12rem', minWidth: '12rem' }}
        />

        {tab === 'monstruos' && (
          <label>
            Tipo:{' '}
            <select value={monsterType} onChange={(e) => setMonsterType(e.target.value)}>
              <option value="todos">Todos los tipos</option>
              {monsterTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        )}

        {tab === 'hechizos' && (
          <>
            <label>
              Nivel:{' '}
              <select value={spellLevel} onChange={(e) => setSpellLevel(e.target.value)}>
                <option value="todos">Todos los niveles</option>
                {SPELL_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level === 0 ? 'Truco (0)' : `Nivel ${level}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Escuela:{' '}
              <select value={spellSchool} onChange={(e) => setSpellSchool(e.target.value)}>
                <option value="todos">Todas las escuelas</option>
                {spellSchools.map((school) => (
                  <option key={school} value={school}>
                    {school}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>

      <p>
        {resultCount} resultado{resultCount === 1 ? '' : 's'}
        {query.trim() ? ` para "${query.trim()}"` : ''}
      </p>

      {tab === 'monstruos' && (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {filteredMonsters.length === 0 && <p>No hay monstruos con ese nombre o tipo.</p>}
          {filteredMonsters.map((m) => (
            <article key={m.name} className="card">
              <h3>
                {m.name} <span className="chip">{m.type}</span>
              </h3>
              <p>
                <strong>CD:</strong> {m.cr} · <strong>Vida:</strong> {m.hp} PV ·{' '}
                <strong>Defensa:</strong> {m.ac}
              </p>
              <p>{m.desc}</p>
            </article>
          ))}
        </div>
      )}

      {tab === 'hechizos' && (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {filteredSpells.length === 0 && <p>No hay hechizos con ese nombre, nivel o escuela.</p>}
          {filteredSpells.map((s) => (
            <article key={s.name} className="card">
              <h3>{s.name}</h3>
              <p>
                <strong>
                  {s.level === 0 ? 'Truco' : `Nivel ${s.level}`} · {s.school}
                </strong>
              </p>
              <p>{s.desc}</p>
            </article>
          ))}
        </div>
      )}

      {tab === 'condiciones' && (
        <ul style={{ display: 'grid', gap: '0.75rem', listStyle: 'none', padding: 0 }}>
          {filteredConditions.length === 0 && <p>No hay condiciones con ese nombre.</p>}
          {filteredConditions.map((c) => (
            <li key={c.name} className="card">
              <strong>{c.name}</strong>
              <p>{c.desc}</p>
            </li>
          ))}
        </ul>
      )}

      {tab === 'acciones' && (
        <ul style={{ display: 'grid', gap: '0.75rem', listStyle: 'none', padding: 0 }}>
          {filteredActions.length === 0 && <p>No hay acciones con ese nombre.</p>}
          {filteredActions.map((a) => (
            <li key={a.name} className="card">
              <strong>{a.name}</strong>
              <p>{a.desc}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
