// Journey to Hell — app multijugador (Supabase Realtime, clave anon).
import { useEffect, useState } from 'react';
import {
  supabase,
  checkSchema,
  getPlayerName,
  setPlayerName,
  type World,
  type CharacterRow,
} from './lib/supabase';
import Play from './components/Play';
import CharacterCreator from './components/CharacterCreator';
import DiceTray from './components/DiceTray';
import BattleMap from './components/BattleMap';
import Atlas from './components/Atlas';
import type { MapaAtlas } from './lib/atlas';
import Compendium from './components/Compendium';
import WorldPanel from './components/WorldPanel';

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

  function saveName() {
    const n = nameInput.trim();
    if (!n) return;
    setPlayerName(n);
    setPlayerNameState(n);
  }

  const living = characters.filter((c) => c.status === 'vivo');
  const fallen = characters.filter((c) => c.status === 'caido');

  if (loading) {
    return (
      <div className="app">
        <header className="hero">
          <h1>⚔️ Journey to Hell</h1>
          <p>Cargando el mundo…</p>
        </header>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="hero">
        <h1>⚔️ Journey to Hell</h1>
        <p>Un solo mundo persistente · Una escapatoria del mundo real · Todos juegan a la vez</p>
        <div className="status-row">
          <span className={`status-dot ${schemaOk ? 'ok' : 'bad'}`} />
          <span>{schemaOk ? 'Conectado al mundo (Supabase en vivo)' : 'Sin conexión a las tablas: aplica schema.sql en Supabase'}</span>
          {playerName && <span>· Jugando como <b>{playerName}</b></span>}
        </div>
        {!playerName && (
          <div className="name-picker">
            <span>¿Cómo te llamas, jugador?</span>
            <input
              type="text"
              placeholder="Tu nombre de jugador"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
            />
            <button className="btn btn-primary" onClick={saveName}>Entrar al mundo</button>
          </div>
        )}
      </header>

      <nav className="tabs">
        {(
          [
            ['jugar', '🎲 Jugar'],
            ['personajes', `🧑 Personajes (${living.length})`],
            ['mundo', '🌍 Mundo'],
            ['mapa', '🗺️ Mapa'],
            ['atlas', '🧭 Atlas'],
            ['compendio', '📚 Compendio'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} className={`tab ${tab === id ? 'tab-active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      {hpFlash && <div className="flash">{hpFlash}</div>}

      <main>
        {tab === 'jugar' && (
          <>
            <Play
              world={world}
              characters={characters}
              schemaOk={schemaOk}
              playerName={playerName}
              onCharactersChange={fetchAll}
            />
            <DiceTray worldId={world?.id ?? null} playerName={playerName} characterName={null} />
          </>
        )}

        {tab === 'personajes' && (
          <div>
            <div className="card">
              <h2>🧑 Compañía de aventureros</h2>
              <p className="hint">
                Cada jugador tiene su propio personaje. Si muere, empiezas de nuevo con otro, nunca el mismo:
                su hoja queda sellada y su nombre no se puede repetir.
              </p>
              <button className="btn btn-primary" onClick={() => setShowCreator(true)}>
                ✨ + Crear personaje (solo escribes el nombre)
              </button>
            </div>
            {showCreator && (
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
            )}
            <div className="grid-cards">
              {characters.map((c) => (
                <div key={c.id} className={`card char-card ${c.status === 'caido' ? 'fallen' : ''}`}>
                  <h3>
                    {c.status === 'caido' ? '☠️ ' : '🧑 '}
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
              setTab('mapa');
            }}
          />
        )}

        {tab === 'compendio' && <Compendium />}
      </main>

      <footer>
        <p>
          Journey to Hell · Un mundo, muchas aventuras · La muerte es permanente, el legado queda ·
          Juego de rol casero compatible con las reglas de la 5ª edición (contenido de referencia abierta)
        </p>
      </footer>
    </div>
  );
}
