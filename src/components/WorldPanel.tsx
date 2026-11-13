// Panel del mundo: ley del mundo, aventuras, restos y legado, crónica,
// y generadores del mundo vivo (rumores, eventos, consecuencias, PNJ).
import { useEffect, useState } from 'react';
import { supabase, type World, type LegacyRow, type JournalRow, type WorldEventRow } from '../lib/supabase';
import { describeWorldEvent } from '../lib/session';
import { ADVENTURES_SEED } from '../lib/compendium';

interface WorldPanelProps {
  world: World | null;
  schemaOk: boolean;
  playerName: string;
}

const RUMORS = [
  'Se dice que en la taberna nueva cantan una canción que nadie compuso.',
  'Un viajero jura que vio el faro encendido… de día.',
  'Los niños del pueblo dicen que el goblin de la campana volvió.',
  'En el mercado venden un mapa que cambia cada noche.',
  'Dicen que alguien encontró una espada vieja en la cripta y no la ha soltado.',
  'El circo pasó de nuevo, pero esta vez nadie lo vio llegar.',
];

const EVENTS = [
  'Una tormenta extraña cubre el valle y los sueños se hacen más fuertes.',
  'Llega una caravana de comerciantes con objetos que nadie reconoce.',
  'El río cambió de color de la noche a la mañana.',
  'Un mensajero trae una carta sin remitente, dirigida al grupo.',
  'Las campanas del pueblo suenan solas al mediodía.',
  'Un viejo árbol del bosque cayó y dentro había una puerta.',
];

const CONSEQUENCES = [
  'La gente del pueblo ya conoce al grupo: les ofrecen comida y un lugar para dormir.',
  'El tabernero puso una mesa con los nombres del grupo: "la mesa de los héroes".',
  'Un niño quiere ser como ustedes y los sigue a todas partes.',
  'El precio de las pociones subió: dicen que los héroes compran mucho.',
  'Alguien pintó un mural del grupo en la pared de la plaza.',
  'Los guardias del pueblo piden consejo al grupo antes de actuar.',
];

const EVOLUTIONS = [
  'El tabernero aprendió a leer y ahora escribe las historias del grupo.',
  'La domadora del circo encontró una nueva bestia: una sombra mansa.',
  'El minero que huyó de la mina volvió… y ahora guía a otros.',
  'El farero por fin bajó del faro y pide trabajo en el pueblo.',
  'El goblin de la campana ahora vende campanitas en el mercado.',
  'El niño del mural creció y quiere unirse al grupo.',
];

const LEGACY_KINDS = [
  { kind: 'tumba', label: '🪦 Tumbas' },
  { kind: 'cancion', label: '🎵 Canciones' },
  { kind: 'leyenda', label: '📜 Leyendas' },
  { kind: 'objeto', label: '🗡️ Objetos' },
  { kind: 'lugar', label: '📍 Lugares' },
] as const;

export default function WorldPanel({ world, schemaOk, playerName }: WorldPanelProps) {
  const [filter, setFilter] = useState<'todas' | 'corta' | 'media' | 'larga'>('todas');
  const [legacies, setLegacies] = useState<LegacyRow[]>([]);
  const [journal, setJournal] = useState<JournalRow[]>([]);
  const [events, setEvents] = useState<WorldEventRow[]>([]);
  const [jTitle, setJTitle] = useState('');
  const [jBody, setJBody] = useState('');
  const [legacyFilter, setLegacyFilter] = useState<string>('todos');

  useEffect(() => {
    if (!schemaOk || !world) return;
    (async () => {
      const { data: l } = await supabase.from('legacies').select('*').eq('world_id', world.id).order('created_at', { ascending: false });
      if (l) setLegacies(l as LegacyRow[]);
      const { data: j } = await supabase.from('journal_entries').select('*').eq('world_id', world.id).order('created_at', { ascending: false }).limit(20);
      if (j) setJournal(j as JournalRow[]);
      const { data: e } = await supabase.from('world_events').select('*').eq('world_id', world.id).order('created_at', { ascending: false }).limit(20);
      if (e) setEvents(e as WorldEventRow[]);
    })();
    const ch = supabase
      .channel('jth-world')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'legacies' }, (p) => setLegacies((prev) => [p.new as LegacyRow, ...prev]))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'journal_entries' }, (p) => setJournal((prev) => [p.new as JournalRow, ...prev].slice(0, 20)))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'world_events' }, (p) => setEvents((prev) => [p.new as WorldEventRow, ...prev].slice(0, 20)))
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [schemaOk, world]);

  async function addJournal() {
    if (!schemaOk || !world || !jBody.trim()) return;
    const { error } = await supabase.from('journal_entries').insert({
      world_id: world.id,
      title: jTitle.trim() || null,
      body: jBody.trim(),
      kind: 'cronica',
    });
    if (!error) {
      setJTitle('');
      setJBody('');
    }
  }

  async function generate(kind: 'rumor' | 'evento' | 'consecuencia' | 'evolucion_pnj') {
    if (!schemaOk || !world) return;
    const pool = kind === 'rumor' ? RUMORS : kind === 'evento' ? EVENTS : kind === 'consecuencia' ? CONSEQUENCES : EVOLUTIONS;
    const body = pool[Math.floor(Math.random() * pool.length)];
    const title =
      kind === 'rumor' ? 'Rumor nuevo' : kind === 'evento' ? 'Evento del mundo' : kind === 'consecuencia' ? 'Consecuencia' : 'Un personaje cambia';
    await supabase.from('world_events').insert({ world_id: world.id, kind, title, body });
    await supabase.from('journal_entries').insert({ world_id: world.id, title, body, kind: kind === 'rumor' ? 'rumor' : kind === 'evento' ? 'evento' : kind === 'consecuencia' ? 'consecuencia' : 'evolucion' });
  }

  const adventures = ADVENTURES_SEED.filter((a) => filter === 'todas' || a.duration === filter);
  const legaciesShown = legacyFilter === 'todos' ? legacies : legacies.filter((l) => l.kind === legacyFilter);

  return (
    <div>
      <div className="card world-header">
        <h2>🌍 {world?.name ?? 'Journey to Hell'}</h2>
        <p>{world?.premise ?? 'Un solo mundo persistente, una escapatoria del mundo real. El mismo mundo, con diferentes lugares y aventuras.'}</p>
        <p className="law">
          <b>📜 Ley del mundo:</b>{' '}
          {world?.law ?? 'La muerte es permanente. Cuando un personaje cae, su hoja queda sellada para siempre y su nombre no puede volver a usarse jamás. Lo que queda de él vive en "Restos y legado".'}
        </p>
        <p className="hint">Jugando como: <b>{playerName || 'sin nombre'}</b> · Todos los jugadores ven este mismo mundo en vivo.</p>
      </div>

      {/* Aventuras */}
      <div className="card">
        <h3>🗺️ Aventuras del mundo</h3>
        <div className="chips">
          {(['todas', 'corta', 'media', 'larga'] as const).map((f) => (
            <button key={f} className={`chip ${filter === f ? 'chip-selected' : ''}`} onClick={() => setFilter(f)}>
              {f === 'todas' ? 'Todas' : f === 'corta' ? 'Cortas · 1 h' : f === 'media' ? 'Medias · 2-3 h' : 'Largas · mundo vivo'}
            </button>
          ))}
        </div>
        {adventures.map((a) => (
          <div key={a.name} className="adventure">
            <b>{a.name}</b> <span className="badge">{a.durationLabel}</span>
            <p>{a.description}</p>
          </div>
        ))}
      </div>

      {/* Restos y legado */}
      <div className="card">
        <h3>🪦 Restos y legado</h3>
        <p className="hint">Lo que queda de quienes pasaron por el mundo: tumbas, canciones, leyendas, objetos y lugares. Los próximos héroes pueden encontrarlo en su camino.</p>
        <div className="chips">
          <button className={`chip ${legacyFilter === 'todos' ? 'chip-selected' : ''}`} onClick={() => setLegacyFilter('todos')}>Todos</button>
          {LEGACY_KINDS.map((k) => (
            <button key={k.kind} className={`chip ${legacyFilter === k.kind ? 'chip-selected' : ''}`} onClick={() => setLegacyFilter(k.kind)}>
              {k.label}
            </button>
          ))}
        </div>
        {legaciesShown.length === 0 && <p className="hint">Aún no hay legados. Cuando un héroe caiga, su historia quedará aquí.</p>}
        {legaciesShown.map((l) => (
          <div key={l.id} className="legacy">
            <b>{l.title}</b> <span className="badge">{l.kind} · {l.character_name}</span>
            {l.place && <span className="hint"> · {l.place}</span>}
            <p>{l.body}</p>
          </div>
        ))}
      </div>

      {/* Mundo vivo entre sesiones */}
      <div className="card">
        <h3>🌱 Mundo vivo — entre sesiones</h3>
        <p className="hint">El mundo sigue vivo aunque no estén jugando. Toca un botón y el mundo cambia.</p>
        <div className="grid-actions">
          <button className="btn btn-action" onClick={() => generate('rumor')}>💬 Nuevo rumor</button>
          <button className="btn btn-action" onClick={() => generate('evento')}>🌪️ Nuevo evento</button>
          <button className="btn btn-action" onClick={() => generate('consecuencia')}>⚖️ Consecuencia</button>
          <button className="btn btn-action" onClick={() => generate('evolucion_pnj')}>🧑 Un personaje cambia</button>
        </div>
        {events.map((e) => (
          <div key={e.id} className="event">
            <b>{e.title}</b> <span className="badge">{e.kind}</span>
            <p>{describeWorldEvent(e)}</p>
          </div>
        ))}
      </div>

      {/* Crónica del mundo */}
      <div className="card">
        <h3>📖 Crónica del mundo</h3>
        <input type="text" placeholder="Título (opcional)" value={jTitle} onChange={(e) => setJTitle(e.target.value)} />
        <textarea placeholder="Escribe qué pasó en la última sesión…" value={jBody} onChange={(e) => setJBody(e.target.value)} rows={3} />
        <button className="btn btn-primary" onClick={addJournal} disabled={!schemaOk || !jBody.trim()}>
          Guardar en la crónica
        </button>
        {journal.map((j) => (
          <div key={j.id} className="journal">
            {j.title && <b>{j.title}</b>} <span className="badge">{j.kind}</span>
            <p>{j.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
