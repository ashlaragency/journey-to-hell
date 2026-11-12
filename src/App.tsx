// Journey to Hell — app multijugador (Supabase Realtime, clave anon).
import { lazy, Suspense, useEffect, useState } from 'react';
import {
  supabase,
  checkSchema,
  getPlayerName,
  setPlayerName,
  type World,
  type CharacterRow,
} from './lib/supabase';
import Play from './components/Play';
import SoundControls from './components/SoundControls';
import { playSound, unlockAudio } from './lib/audio';
import DiceTray from './components/DiceTray';
import type { MapaAtlas } from './lib/atlas';

const CharacterCreator = lazy(() => import('./components/CharacterCreator'));
const BattleMap = lazy(() => import('./components/BattleMap'));
const Atlas = lazy(() => import('./components/Atlas'));
const Compendium = lazy(() => import('./components/Compendium'));
const WorldPanel = lazy(() => import('./components/WorldPanel'));

type Tab = 'jugar' | 'personajes' | 'mundo' | 'mapa' | 'atlas' | 'compendio';

export default function App() {
  const [tab, setTab] = useState<Tab>('jugar');
  const [playerName, setPlayerNameState] = useState(getPlayerName());
  const [nameInput, setNameInput] = useState('');
  const [world, setWorld] = useState<World | null>(null);
  const [characters, setCharacters] = useState<CharacterRow[]>([]);
  const [schemaOk, setSchemaOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [hpFlash, setHpFlash] = useState<string | null>(null);
  const [mapaAtlas, setMapaAtlas] = useState<MapaAtlas | null>(null);

  const fetchAll = async () => {
    const { data: w } = await supabase.from('worlds').select('*').limit(1);
    if (w && w.length > 0) setWorld(w[0] as World);
    const { data: chars } = await supabase
      .from('characters')
      .select('*')
      .order('created_at', { ascending: true });
    if (chars) setCharacters(chars as CharacterRow[]);
  };

  useEffect(() => {
    (async () => {
      const check = await checkSchema();
      setSchemaOk(check.ok);
      if (check.ok) await fetchAll();
      setLoading(false);
    })();
    const ch = supabase
      .channel('jth-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'characters' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'worlds' }, () => fetchAll())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  async function changeHp(c: CharacterRow, delta: number) {
    const next = Math.max(0, Math.min(c.max_hp, c.hp + delta));
    if (!schemaOk) return;
    await supabase.from('characters').update({ hp: next }).eq('id', c.id);
    setHpFlash(`${c.name}: ${next}/${c.max_hp}`);
    setTimeout(() => setHpFlash(null), 1500);
    fetchAll();
  }

  function navigate(nextTab: Tab) {
    if (nextTab !== tab) playSound('page');
    setTab(nextTab);
  }

  function saveName() {
    const n = nameInput.trim();
    if (!n) return;
    setPlayerName(n);
    setPlayerNameState(n);
  }

  const living = characters.filter((c) => c.status === 'vivo');
  const fallen = characters.filter((c) => c.status === 'caido');

  if (loading) {
    return <div className="loading-world" role="status"><span className="brand-sigil" aria-hidden="true">J</span><h1>Journey to Hell</h1><p>Cargando el mundo…</p></div>;
  }

  return (
    <div className="app" onClickCapture={() => unlockAudio()} onKeyDownCapture={(event) => {
      if (!event.repeat) unlockAudio();
    }}>
        <a className="skip-link" href="#contenido">Ir al contenido</a>
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate('jugar')} aria-label="Journey to Hell, ir a Jugar">
          <span className="brand-sigil" aria-hidden="true">J</span>
          <span>Journey<span className="brand-second">to Hell</span></span>
        </button>
        <nav className="tabs" aria-label="Navegación principal">
          {([
            ['jugar', 'Jugar', '◇'],
            ['personajes', 'Personajes', '♙'],
            ['mundo', 'Mundo', '◎'],
            ['mapa', 'Mapa', '⌖'],
            ['atlas', 'Atlas', '✧'],
            ['compendio', 'Compendio', '▤'],
          ] as [Tab, string, string][]).map(([id, label, icon]) => (
            <button key={id} className={`tab ${tab === id ? 'tab-active' : ''}`}
              aria-current={tab === id ? 'page' : undefined} onClick={() => navigate(id)}>
              <span className="nav-icon" aria-hidden="true">{icon}</span>
              {label}
              {id === 'personajes' && <span className="nav-count">{living.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-world">
          <span className="world-seal" aria-hidden="true">∞</span>
          <p>Un mundo. Una vida.</p>
          <small>La muerte es permanente.<br />Tu legado permanece.</small>
        </div>
        <div className="sidebar-player">
          <span className="character-avatar" aria-hidden="true">{playerName.slice(0, 1).toUpperCase() || 'V'}</span>
          <div><strong>{playerName || 'Viajero'}</strong><small>{playerName ? 'Tu lugar en la historia' : 'Entra al mundo'}</small></div>
        </div>
      </aside>

      <div className="workspace">
        <header className="workspace-header">
          <div>
            <p className="world-name">{world?.name ?? 'Journey to Hell'}</p>
            <h1>{{ jugar: 'La aventura', personajes: 'La compañía', mundo: 'El mundo vivo', mapa: 'Mesa de batalla', atlas: 'Atlas del descenso', compendio: 'El compendio' }[tab]}</h1>
          </div>
          <div className="header-tools">
            <SoundControls />
            <div className="status-row" role="status">
              <span className={`status-dot ${schemaOk ? 'ok' : 'bad'}`} />
              <span>{schemaOk ? 'Mundo conectado' : 'Conexión interrumpida'}</span>
            </div>
          </div>
        </header>
        {!playerName && (
          <form className="name-picker" onSubmit={(event) => { event.preventDefault(); saveName(); }}>
            <label htmlFor="player-name">Tu nombre de jugador</label>
            <input id="player-name" type="text" placeholder="¿Cómo te llaman?"
              maxLength={40} autoComplete="nickname"
              value={nameInput} onChange={(event) => setNameInput(event.target.value)} />
            <button className="btn btn-primary" type="submit" disabled={!nameInput.trim()}>Entrar al mundo</button>
          </form>
        )}

      {hpFlash && <div className="flash" role="status">{hpFlash}</div>}

      <main id="contenido" tabIndex={-1}>
        {tab === 'jugar' && (
          <div className="dashboard-layout">
            <Play
              world={world}
              characters={characters}
              schemaOk={schemaOk}
              playerName={playerName}
              onCharactersChange={fetchAll}
            />
            <aside className="session-panel" aria-label="Compañía y dados">
              <section className="party-panel card">
                <div className="section-heading"><h2>Tu compañía</h2><span className="party-count">{living.length}</span></div>
                {living.length === 0 && <p className="hint">El mundo espera a su primer héroe.</p>}
                <ul className="party-list">
                  {living.slice(0, 4).map((character) => (
                    <li key={character.id}>
                      <span className="character-avatar" aria-hidden="true">{character.name.slice(0, 1)}</span>
                      <div><strong>{character.name}</strong><small>{character.class_name} · Nivel {character.level}</small>
                        <div className="hp-bar" role="meter" aria-label={`Vida de ${character.name}`} aria-valuenow={character.hp} aria-valuemin={0} aria-valuemax={character.max_hp}>
                          <div style={{ width: `${Math.max(0, Math.min(100, character.hp / character.max_hp * 100))}%` }} />
                        </div>
                      </div>
                      <span className="party-hp">{character.hp}<small>/{character.max_hp}</small></span>
                    </li>
                  ))}
                </ul>
                <button className="btn party-link" onClick={() => { navigate('personajes'); if (!living.length) setShowCreator(true); }}>
                  {living.length ? 'Ver personajes' : 'Crear mi personaje'}
                </button>
              </section>
              <DiceTray key={world?.id} worldId={world?.id ?? null} playerName={playerName} characterName={null} />
            </aside>
          </div>
        )}

        {tab === 'personajes' && (
          <div>
            <div className="card">
              <h2>Compañía de aventureros</h2>
              <p className="hint">
                Cada jugador tiene su propio personaje. Si muere, empiezas de nuevo con otro, nunca el mismo:
                su hoja queda sellada y su nombre no se puede repetir.
              </p>
              <button className="btn btn-primary" onClick={() => setShowCreator(true)}>
                Crear personaje
              </button>
            </div>
            {showCreator && (
              <Suspense fallback={<p role="status">Cargando creador…</p>}>
                <CharacterCreator
                  worldId={world?.id ?? null}
                  playerName={playerName}
                  schemaOk={schemaOk}
                  onCreated={() => {
                    setShowCreator(false);
                    fetchAll();
                  }}
                  onCancel={() => setShowCreator(false)}
                />
              </Suspense>
            )}
            <div className="grid-cards">
              {characters.map((c) => (
                <div key={c.id} className={`card char-card ${c.status === 'caido' ? 'fallen' : ''}`}>
                  <h3>
                    {c.status === 'caido' ? '† ' : ''}
                    {c.name}
                  </h3>
                  <p>
                    {c.species} {c.class_name} · Nivel {c.level}
                  </p>
                  <p>
                    Vida {c.hp}/{c.max_hp} · Defensa {c.ac}
                  </p>
                  <div className="hp-bar">
                    <div style={{ width: `${(Math.max(0, c.hp) / c.max_hp) * 100}%` }} />
                  </div>
                  <p className="hint">
                    FUE {c.str} · DES {c.dex} · CON {c.con} · INT {c.int} · SAB {c.wis} · CAR {c.cha}
                  </p>
                  <p className="hint">
                    {c.weapon ?? ''} {c.armor ? `· ${c.armor}` : ''} {c.shield ? '· con escudo' : ''}
                  </p>
                  {c.background && <p className="hint">Trasfondo: {c.background}</p>}
                  {c.personality && <p className="hint">Así es: {c.personality}</p>}
                  {c.motivation && <p className="hint">Busca: {c.motivation}</p>}
                  {c.status === 'vivo' && (
                    <div className="row">
                      <button className="btn" onClick={() => changeHp(c, -1)}>−1 vida</button>
                      <button className="btn" onClick={() => changeHp(c, -5)}>−5</button>
                      <button className="btn" onClick={() => changeHp(c, 1)}>+1 vida</button>
                      <button className="btn" onClick={() => changeHp(c, 5)}>+5</button>
                      <button
                        className="btn"
                        onClick={() => changeHp(c, c.max_hp - c.hp)}
                      >
                        Descanso largo
                      </button>
                    </div>
                  )}
                  {c.status === 'caido' && (
                    <p className="fallen-note">
                      ☠️ Caído. {c.death_note ?? 'Su historia quedó en el mundo.'} Su nombre no se puede volver a usar.
                    </p>
                  )}
                </div>
              ))}
            </div>
            {characters.length === 0 && (
              <p className="hint">Aún no hay personajes. Crea el primero y el mundo empezará a vivir.</p>
            )}
            {fallen.length > 0 && (
              <p className="hint">Caídos: {fallen.map((c) => c.name).join(', ')} — sus restos quedan en «Restos y legado».</p>
            )}
          </div>
        )}

        <Suspense fallback={<p role="status">Cargando sección…</p>}>
          {tab === 'mundo' && <WorldPanel world={world} schemaOk={schemaOk} playerName={playerName} />}

          {tab === 'mapa' && (
            <BattleMap
              worldId={world?.id ?? null}
              characters={characters}
              schemaOk={schemaOk}
              mapaInicial={mapaAtlas}
            />
          )}

          {tab === 'atlas' && (
            <Atlas
              onAbrirMapa={(m) => {
                setMapaAtlas(m);
                navigate('mapa');
              }}
            />
          )}

          {tab === 'compendio' && <Compendium />}
        </Suspense>
      </main>

      <footer>
        <span>Journey to Hell</span>
        <span>La historia continúa con cada decisión.</span>
      </footer>
      </div>
    </div>
  );
}
