// Journey to Hell — app multijugador (Supabase Realtime, clave anon).
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
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
import GameIcon from './components/GameIcon';
import WorldActivity from './components/WorldActivity';
import CombatEffects from './components/CombatEffects';
import CharacterPortrait from './components/CharacterPortrait';
import { readAppearance } from './lib/appearance';
import { useSession } from './hooks/useSession';
import { useTablePresence } from './hooks/useTablePresence';
import './LivingShell.css';

const CharacterCreator = lazy(() => import('./components/CharacterCreator'));
const AppearanceEditor = lazy(() => import('./components/AppearanceEditor'));
const BattleMap = lazy(() => import('./components/BattleMap'));
const Atlas = lazy(() => import('./components/Atlas'));
const Compendium = lazy(() => import('./components/Compendium'));
const Infernalista = lazy(() => import('./components/Infernalista'));
const WorldPanel = lazy(() => import('./components/WorldPanel'));

type Tab = 'infernalista' | 'jugar' | 'personajes' | 'mundo' | 'mapa' | 'atlas' | 'compendio';

function readPreference(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function savePreference(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* La sesión funciona sin almacenamiento local. */ }
}

export default function App() {
  const [role, setRole] = useState<'aventurero' | 'infernalista'>(() => readPreference('jth_role') === 'infernalista' ? 'infernalista' : 'aventurero');
  const [tab, setTab] = useState<Tab>(() => readPreference('jth_role') === 'infernalista' ? 'infernalista' : 'jugar');
  const [motionPaused, setMotionPaused] = useState(() => readPreference('jth_motion') === 'paused');
  const [pageHidden, setPageHidden] = useState(document.hidden);
  const [playerName, setPlayerNameState] = useState(getPlayerName());
  const [nameInput, setNameInput] = useState('');
  const [world, setWorld] = useState<World | null>(null);
  const [characters, setCharacters] = useState<CharacterRow[]>([]);
  const [schemaOk, setSchemaOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [editingAppearance, setEditingAppearance] = useState<string | null>(null);
  const [hpFlash, setHpFlash] = useState<string | null>(null);
  const [mapaAtlas, setMapaAtlas] = useState<MapaAtlas | null>(null);
  const session = useSession(world?.id, schemaOk);
  const presence = useTablePresence(world?.id, schemaOk, playerName, role);
  const presentNames = useMemo(() => presence.members.map((member) => member.name), [presence.members]);
  const sharedScene = session.cue?.payload.active ? { id: session.cue.id, ...session.cue.payload } : null;
  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const fetchAll = async () => {
    const { data: w } = await supabase.from('worlds').select('*').limit(1);
    if (!w?.length) return;
    setWorld(w[0] as World);
    const { data: chars } = await supabase
      .from('characters')
      .select('*')
      .eq('world_id', w[0].id)
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
    if (c.status !== 'vivo') return;
    const { error } = await supabase.from('characters').update({ hp: next }).eq('id', c.id).eq('status', 'vivo').eq('hp', c.hp).select('id').single();
    if (error) {
      setHpFlash('No se pudo guardar la vida. Actualiza la hoja e inténtalo de nuevo.');
      void fetchAll();
      return;
    }
    setHpFlash(`${c.name}: ${next}/${c.max_hp}`);
    setTimeout(() => setHpFlash(null), 1500);
    fetchAll();
  }

  function navigate(nextTab: Tab) {
    if (nextTab !== tab) playSound('page');
    setTab(nextTab);
  }

  function chooseRole(next: 'aventurero' | 'infernalista') {
    setRole(next);
    savePreference('jth_role', next);
    navigate(next === 'infernalista' ? 'infernalista' : 'jugar');
  }

  function openCreator() { navigate('personajes'); setShowCreator(true); }

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
    <div className={`app living-app view-${tab} ${motionPaused || pageHidden ? 'motion-paused' : ''}`} onClickCapture={() => unlockAudio()} onKeyDownCapture={(event) => {
      if (!event.repeat) unlockAudio();
    }}>
        <CombatEffects worldId={world?.id} schemaOk={schemaOk} motionPaused={motionPaused || pageHidden} />
        <a className="skip-link" href="#contenido">Ir al contenido</a>
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate(role === 'infernalista' ? 'infernalista' : 'jugar')} aria-label="Journey to Hell, ir al inicio">
          <span className="brand-sigil" aria-hidden="true">J</span>
          <span>Journey <span className="brand-second">to Hell</span></span>
        </button>
        <nav className="tabs" aria-label="Navegación principal">
          {([
            [role === 'infernalista' ? 'infernalista' : 'jugar', role === 'infernalista' ? 'Mi grimorio' : 'Aventura', role === 'infernalista' ? 'crown' : 'play'],
            ['mapa', 'Mesa', 'map'],
            ['personajes', 'Compañía', 'people'],
            ['atlas', 'Atlas', 'atlas'],
            ['mundo', 'Crónica', 'world'],
            ['compendio', 'Bestiario', 'book'],
          ] as const).map(([id, label, icon]) => (
            <button key={id} className={`tab ${tab === id ? 'tab-active' : ''}`}
              aria-current={tab === id ? 'page' : undefined} onClick={() => navigate(id)}>
              <GameIcon name={icon} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-player">
          <span className="character-avatar" aria-hidden="true">{playerName.slice(0, 1).toUpperCase() || 'V'}</span>
          <div><strong>{playerName || 'Viajero'}</strong><small>{role === 'infernalista' ? 'Infernalista' : 'Aventurero'}</small></div>
        </div>
      </aside>

      <div className="workspace">
        <header className="workspace-header">
          <div>
            <p className="world-name">Un mundo. Una vida. Tu historia.</p>
            <h1>{{ jugar: 'La aventura continúa', infernalista: 'La mesa del Infernalista', personajes: 'La compañía', mundo: 'El mundo vivo', mapa: 'La mesa encantada', atlas: 'Atlas del descenso', compendio: 'El compendio' }[tab]}</h1>
          </div>
          <div className="role-switch" role="group" aria-label="Tu lugar en la mesa">
            <button onClick={() => chooseRole('aventurero')} aria-pressed={role === 'aventurero'}><GameIcon name="play" /> Aventurero</button>
            <button onClick={() => chooseRole('infernalista')} aria-pressed={role === 'infernalista'}><GameIcon name="crown" /> Infernalista</button>
          </div>
          <div className="header-tools">
            <button className="motion-toggle" aria-pressed={motionPaused} aria-label={motionPaused ? 'Activar movimiento ambiental' : 'Pausar movimiento ambiental'} title={motionPaused ? 'Activar movimiento' : 'Pausar movimiento'} onClick={() => {
              setMotionPaused(!motionPaused); savePreference('jth_motion', motionPaused ? 'running' : 'paused');
            }}><GameIcon name={motionPaused ? 'play' : 'pause'} /></button>
            <SoundControls />
            <div className="status-row" role="status">
              <span className={`status-dot ${schemaOk && session.connected ? 'ok' : 'bad'}`} />
              <span>{!schemaOk ? 'Sin conexión' : session.connected ? 'Mundo en vivo' : 'Reconectando…'}</span>
            </div>
          </div>
        </header>
        <div className="table-presence" aria-label="Presencia en la mesa">
          <span className="presence-title"><span className={`status-dot ${presence.connected ? 'ok' : 'bad'}`} />{presence.connected ? `${presence.members.length} ${presence.members.length === 1 ? 'persona' : 'personas'} en la mesa` : 'Conectando la mesa…'}</span>
          <div className="presence-members">{presence.members.slice(0, 6).map((member) => <span key={member.id} title={`${member.name} · ${member.role}`}><i aria-hidden="true">{member.name.charAt(0)}</i>{member.name}{member.role === 'infernalista' && <GameIcon name="crown" />}</span>)}</div>
        </div>
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
        {session.error && <div className="banner-warning" role="status">{session.error} <button className="btn" onClick={() => void session.refresh()}>Reintentar</button></div>}
        {tab === 'jugar' && (
          <div className="dashboard-layout">
            <Play
              world={world}
              characters={characters}
              schemaOk={schemaOk}
              playerName={playerName}
              onCharactersChange={fetchAll}
              sharedScene={sharedScene}
              presentNames={presentNames}
              presenceConnected={presence.connected}
              onCreateCharacter={openCreator}
              onOpenMap={() => navigate('mapa')}
            />
            <aside className="session-panel" aria-label="Compañía y dados">
              <WorldActivity worldId={world?.id} enabled={schemaOk} />
              <section className="party-panel card">
                <div className="section-heading"><h2>Tu compañía</h2><span className="party-count">{living.length}</span></div>
                {living.length === 0 && <p className="hint">El mundo espera a su primer héroe.</p>}
                <ul className="party-list">
                  {living.slice(0, 4).map((character) => (
                    <li key={character.id}>
                      <CharacterPortrait species={character.species} profession={character.class_name} appearance={readAppearance(character.notes)} name={character.name} compact decorative className="character-avatar party-character-portrait" />
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
              <details className="dice-dock" id="dados"><summary><GameIcon name="spark" /><span>Los dados del destino<small>Abre tu mesa de tiradas</small></span><span aria-hidden="true">＋</span></summary><DiceTray key={world?.id} worldId={world?.id ?? null} playerName={playerName} characterName={null} /></details>
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
                  <CharacterPortrait species={c.species} profession={c.class_name} appearance={readAppearance(c.notes)} weapon={c.weapon} armor={c.armor} shield={c.shield} pack={c.pack} name={c.name} className="company-character-portrait" />
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
                  {c.status === 'vivo' && <button className="btn" onClick={() => setEditingAppearance((current) => current === c.id ? null : c.id)}>{editingAppearance === c.id ? 'Cerrar apariencia' : 'Cambiar peinado y color'}</button>}
                  {editingAppearance === c.id && c.status === 'vivo' && <Suspense fallback={<p role="status">Cargando ajustes…</p>}><AppearanceEditor character={c} schemaOk={schemaOk} onSaved={() => { setEditingAppearance(null); void fetchAll(); }} onCancel={() => setEditingAppearance(null)} /></Suspense>}
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
                      † Caído. {c.death_note ?? 'Su historia quedó en el mundo.'} Su nombre no se puede volver a usar.
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
          {tab === 'infernalista' && <Infernalista world={world} characters={characters} schemaOk={schemaOk} playerName={playerName} onOpenMap={() => navigate('mapa')} onOpenPlay={() => navigate('jugar')} />}
          {tab === 'mundo' && <WorldPanel world={world} schemaOk={schemaOk} playerName={playerName} />}

          {tab === 'mapa' && (
            <BattleMap
              worldId={world?.id ?? null}
              characters={characters}
              schemaOk={schemaOk}
              mapaInicial={mapaAtlas}
              onOpenPlay={() => navigate('jugar')}
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

      {tab === 'jugar' && <button className="quick-dice" onClick={() => {
        const dice = document.getElementById('dados') as HTMLDetailsElement | null;
        if (dice) { dice.open = true; dice.scrollIntoView({ behavior: motionPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' }); dice.querySelector('summary')?.focus({ preventScroll: true }); }
      }}><GameIcon name="spark" /> Tirar dados</button>}
      <footer>
        <span>Journey to Hell</span>
        <span>La historia continúa con cada decisión.</span>
      </footer>
      </div>
    </div>
  );
}
