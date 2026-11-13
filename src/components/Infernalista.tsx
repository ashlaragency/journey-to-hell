import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, type CharacterRow, type CombatRow, type World } from '../lib/supabase';
import { SCENE_EVENT_TITLE, type SceneCuePayload } from '../lib/session';
import { useSession } from '../hooks/useSession';
import { playSound } from '../lib/audio';
import { abilityMod, rollDie } from '../lib/data';
import { nextTurn } from '../lib/rearguard';
import MonsterPortrait from './MonsterPortrait';
import CharacterPortrait from './CharacterPortrait';
import { readAppearance } from '../lib/appearance';
import './Infernalista.css';

interface InfernalistaProps {
  world: World | null;
  characters: CharacterRow[];
  schemaOk: boolean;
  playerName: string;
  onOpenMap: () => void;
  onOpenPlay: () => void;
}
interface Adventure {
  id: string;
  name: string;
  duration_label: string;
  description: string | null;
  scenes: { place: string; narration: string }[];
  enemies: { name: string; hp: number; ac: number; attack_bonus: number; damage_dice: string }[];
}
const TWISTS = [
  { title: 'Un presagio', body: 'Las antorchas se inclinan hacia la misma puerta. Al otro lado, alguien pronuncia un nombre del grupo.' },
  { title: 'Un encuentro inesperado', body: 'Un viajero herido pide refugio. Lleva un mapa incompleto y asegura que algo lo sigue desde el último cruce.' },
  { title: 'El mundo responde', body: 'La noticia de las decisiones del grupo llegó antes que ellos. Alguien los espera con una deuda, una promesa o una advertencia.' },
];

export default function Infernalista({ world, characters, schemaOk, playerName, onOpenMap, onOpenPlay }: InfernalistaProps) {
  const { cue, loading: syncing, error: syncError, connected, refresh } = useSession(world?.id, schemaOk);
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [draft, setDraft] = useState<{ adventureId: string; sceneIndex: number } | null>(null);
  const [combat, setCombat] = useState<CombatRow | null>(null);
  const [combatError, setCombatError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [twist, setTwist] = useState(0);
  const busy = useRef(false);
  const mounted = useRef(true);
  const worldId = world?.id;
  const living = characters.filter((character) => character.status === 'vivo' && character.world_id === worldId);
  const adventure = adventures.find((item) => item.id === (draft?.adventureId ?? cue?.payload.adventureId)) ?? adventures[0];
  const sceneIndex = Math.min(Math.max(0, draft?.sceneIndex ?? (cue && adventure && cue.payload.adventureId === adventure.id ? cue.payload.sceneIndex : 0)), Math.max(0, (adventure?.scenes.length ?? 1) - 1));
  const scene = adventure?.scenes[sceneIndex];
  const publishedHere = cue?.payload.active && cue.payload.adventureId === adventure?.id && cue.payload.sceneIndex === sceneIndex;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!schemaOk || !worldId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const { data, error } = await supabase.from('adventures')
          .select('id,name,duration_label,description,scenes(place,narration),enemies(name,hp,ac,attack_bonus,damage_dice)')
          .eq('world_id', worldId).order('name', { ascending: true })
          .order('position', { referencedTable: 'scenes', ascending: true }).abortSignal(controller.signal);
        if (controller.signal.aborted) return;
        if (error) throw error;
        setAdventures((data ?? []) as Adventure[]);
      } catch {
        if (!controller.signal.aborted) setLoadError('No se pudieron cargar las aventuras. Tus preparativos siguen aquí.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [worldId, schemaOk, retry]);

  const refreshCombatRef = useRef<() => Promise<void>>(async () => {});
  const refreshCombat = useCallback(async () => { await refreshCombatRef.current(); }, []);
  useEffect(() => {
    if (!schemaOk || !worldId) return;
    let disposed = false;
    let version = 0;
    const controller = new AbortController();
    const loadCombat = async () => {
      const readVersion = ++version;
      try {
        const { data, error } = await supabase.from('combat').select('*').eq('world_id', worldId).eq('active', true)
          .order('created_at', { ascending: false }).limit(1).abortSignal(controller.signal).maybeSingle();
        if (disposed || readVersion !== version) return;
        if (error) throw error;
        setCombat(data as CombatRow | null);
        setCombatError(null);
      } catch {
        if (!disposed && readVersion === version) setCombatError('No se pudo comprobar el combate. Sincroniza antes de dirigirlo.');
      }
    };
    refreshCombatRef.current = loadCombat;
    void loadCombat();
    const channel = supabase.channel(`jth-director-combat-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combat', filter: `world_id=eq.${worldId}` }, () => { void loadCombat(); })
      .subscribe((status) => { if (status === 'SUBSCRIBED') void loadCombat(); });
    const visible = () => { if (document.visibilityState === 'visible') void loadCombat(); };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', loadCombat);
    return () => {
      disposed = true;
      controller.abort();
      refreshCombatRef.current = async () => {};
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('online', loadCombat);
      void supabase.removeChannel(channel);
    };
  }, [worldId, schemaOk]);

  async function perform(label: string, operation: () => Promise<string>, sound: 'page' | 'combat' | 'select' = 'page') {
    if (busy.current || !schemaOk || !worldId) return;
    busy.current = true;
    setPending(label);
    setNotice(null);
    try {
      const text = await operation();
      if (mounted.current) { setNotice({ text, error: false }); playSound(sound); }
    } catch (error) {
      if (mounted.current) {
        setNotice({ text: error instanceof Error ? error.message : 'No se pudo guardar el cambio. Inténtalo de nuevo.', error: true });
        playSound('failure');
      }
    } finally {
      busy.current = false;
      if (mounted.current) setPending(null);
    }
  }

  async function publishScene(nextIndex = sceneIndex, active = true) {
    const nextScene = adventure?.scenes[nextIndex];
    if ((active && (!nextScene || !adventure)) || (!active && !cue)) return;
    const payload: SceneCuePayload = !active && cue
      ? { ...cue.payload, active: false, director: playerName.trim() || 'Infernalista' }
      : { type: 'jth.scene.v1', adventureId: adventure!.id, sceneIndex: nextIndex, place: nextScene!.place, narration: nextScene!.narration, director: playerName.trim() || 'Infernalista', active: true };
    await perform('escena', async () => {
      const { error, data } = await supabase.from('world_events').insert({ world_id: worldId, kind: 'evento', title: SCENE_EVENT_TITLE, body: JSON.stringify(payload) }).select('id').single();
      if (error || !data) throw new Error('La escena no se publicó. La mesa conserva su escena anterior. Inténtalo de nuevo.');
      if (active) setDraft({ adventureId: payload.adventureId, sceneIndex: nextIndex });
      await refresh();
      return active ? `Escena compartida: ${payload.place}. Los jugadores reciben el cambio en su aventura.` : 'Recorrido libre. Los jugadores vuelven a elegir cómo avanzar.';
    });
  }

  async function startEncounter() {
    if (!adventure || !living.length || combat || combatError) return;
    await perform('combate', async () => {
      const { data: current, error: readError } = await supabase.from('combat').select('id').eq('world_id', worldId).eq('active', true).limit(1);
      if (readError) throw new Error('No se pudo comprobar si ya hay un combate. Inténtalo de nuevo.');
      if (current?.length) { await refreshCombat(); throw new Error('La mesa ya tiene un combate. Se ha actualizado el encuentro.'); }
      const combatants = [
        ...living.filter((character) => character.hp > 0).map((character) => ({ kind: 'pc' as const, ref_id: character.id, name: character.name, initiative: rollDie(20) + abilityMod(character.dex), hp: character.hp, max_hp: character.max_hp, ac: character.ac })),
        ...adventure.enemies.map((enemy, index) => ({ kind: 'enemy' as const, ref_id: `enemy-${index}`, name: enemy.name, initiative: rollDie(20), hp: enemy.hp, max_hp: enemy.hp, ac: enemy.ac })),
      ].sort((a, b) => b.initiative - a.initiative);
      const { error, data } = await supabase.from('combat').insert({ world_id: worldId, adventure_id: adventure.id, active: true, round: 1, turn_index: 0, combatants, log: [`${playerName.trim() || 'El Infernalista'} abre el encuentro de ${adventure.name}.`] }).select('*').single();
      if (error || !data) throw new Error('No se pudo abrir el combate. Inténtalo de nuevo.');
      setCombat(data as CombatRow);
      return 'El encuentro está en marcha. La iniciativa ya está ordenada.';
    }, 'combat');
  }

  async function changeTurn(finish = false) {
    if (!combat || combatError || !combat.combatants.length) return;
    // Salta a los caídos y a quienes esperan en la retaguardia.
    const turn = nextTurn(combat.combatants, combat.turn_index, combat.round);
    const nextIndex = turn?.turn_index ?? combat.turn_index;
    const round = turn?.round ?? combat.round;
    await perform('turno', async () => {
      const previousUpdate = Date.parse(combat.updated_at);
      const updatedAt = new Date(Math.max(Date.now(), Number.isFinite(previousUpdate) ? previousUpdate + 1 : 0)).toISOString();
      const { data, error } = await supabase.from('combat').update({ active: !finish, turn_index: finish ? combat.turn_index : nextIndex, round: finish ? combat.round : round, log: finish ? [...combat.log, 'El Infernalista cierra el encuentro.'] : combat.log, updated_at: updatedAt })
        .eq('id', combat.id).eq('world_id', worldId).eq('active', true).eq('updated_at', combat.updated_at).select('*').maybeSingle();
      if (error) throw new Error('No se pudo guardar el turno. Inténtalo de nuevo.');
      if (!data) { await refreshCombat(); throw new Error('La mesa cambió mientras dirigías. Revisa el turno actualizado e inténtalo de nuevo.'); }
      setCombat(finish ? null : data as CombatRow);
      setConfirmEnd(false);
      return finish ? 'Encuentro cerrado. El mundo conserva lo ocurrido.' : `Ahora actúa ${combat.combatants[nextIndex].name}.`;
    }, 'select');
  }

  async function publishTwist() {
    const event = TWISTS[twist];
    await perform('evento', async () => {
      const { data, error } = await supabase.from('world_events').insert({ world_id: worldId, kind: 'evento', ...event }).select('id').single();
      if (error || !data) throw new Error('No se pudo compartir el acontecimiento. Inténtalo de nuevo.');
      return 'Acontecimiento compartido. Ya forma parte de la historia del mundo.';
    });
  }

  const turn = combat?.combatants[combat.turn_index % combat.combatants.length];
  const available = schemaOk && !!worldId && !pending;

  return (
    <div className="infernalista">
      <div className="infernal-masthead">
        <p className="infernal-eyebrow">LA MESA DEL INFERNALISTA</p>
        <div className="infernal-live"><span className={connected ? 'is-live' : ''} />{connected ? 'Mesa sincronizada' : syncing ? 'Sincronizando mesa…' : 'Mesa sin conexión en vivo'}</div>
      </div>
      {!schemaOk && <p className="banner-warning" role="status">No se pudo conectar con el mundo. Los cambios estarán disponibles cuando vuelva la conexión.</p>}
      {(syncError || loadError || combatError) && <div className="banner-warning" role="status"><p>{syncError || loadError || combatError}</p><button className="btn" onClick={() => { setLoading(true); setLoadError(null); setRetry((value) => value + 1); void refresh(); void refreshCombat(); }}>Volver a sincronizar</button></div>}
      {notice && <div className={`infernal-notice ${notice.error ? 'is-error' : ''}`} role={notice.error ? 'alert' : 'status'}>{notice.text}</div>}

      <section className="infernal-book" aria-labelledby="infernal-title">
        <div className="infernal-book-binding" aria-hidden="true" />
        <div className="infernal-page infernal-page-left">
          <header className="infernal-book-title">
            <div className="infernal-guardian" aria-hidden="true" />
            <p className="infernal-eyebrow">JOURNEY TO HELL</p>
            <h2 id="infernal-title">El grimorio<br /><em>del Infernalista</em></h2>
            <p>Prepara el camino. Da voz al mundo.<br />Deja que sus decisiones lo cambien.</p>
          </header>
          <section className="infernal-chapter" aria-labelledby="director-scene-title">
            <div className="infernal-section-heading"><span className="infernal-step">I</span><div><p className="infernal-eyebrow">EL CAMINO</p><h3 id="director-scene-title">Elige el capítulo</h3></div></div>
            {loading && schemaOk ? <p role="status" className="hint">Abriendo el libro de aventuras…</p> : !adventures.length ? <p className="hint">Las aventuras aparecerán cuando el mundo esté disponible.</p> : <>
              <label htmlFor="director-adventure">Aventura de la mesa</label>
              <select id="director-adventure" value={adventure?.id ?? ''} onChange={(event) => { setDraft({ adventureId: event.target.value, sceneIndex: 0 }); setNotice(null); }} disabled={!!pending}>
                {adventures.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.duration_label}</option>)}
              </select>
              {adventure?.description && <p className="infernal-adventure-description">{adventure.description}</p>}
              <p className="infernal-index-label">ÍNDICE DE ESCENAS</p>
              <ol className="infernal-scene-path" aria-label="Escenas de la aventura">
                {adventure?.scenes.map((item, index) => <li key={`${index}-${item.place}`}><button className={index === sceneIndex ? 'is-selected' : ''} aria-pressed={index === sceneIndex} onClick={() => setDraft({ adventureId: adventure.id, sceneIndex: index })} disabled={!!pending}><span>{String(index + 1).padStart(2, '0')}</span><b>{item.place}</b>{cue?.payload.active && cue.payload.adventureId === adventure.id && cue.payload.sceneIndex === index && <small>En mesa</small>}</button></li>)}
              </ol>
            </>}
            {cue?.payload.active && <div className="infernal-current"><span>La mesa está en <strong>{cue.payload.place}</strong>, dirigida por {cue.payload.director}.</span><button className="infernal-text-button" disabled={!available || !!combat} onClick={() => void publishScene(0, false)}>Dejar recorrido libre</button></div>}
          </section>
          <nav className="infernal-book-links" aria-label="Herramientas de la mesa"><button className="infernal-text-button" onClick={onOpenPlay}>Ver la aventura ↗</button><button className="infernal-text-button" onClick={onOpenMap}>Mesa de batalla ↗</button></nav>
          <div className="infernal-folio" aria-hidden="true"><span />EL CAMINO<span /></div>
        </div>

        <div className="infernal-page infernal-page-right">
          <div className="infernal-page-rubric"><span>{publishedHere ? 'EN LA MESA' : 'PREPARACIÓN · AÚN SIN COMPARTIR'}</span><span>{String(sceneIndex + 1).padStart(2, '0')}</span></div>
          {scene ? <article className="infernal-scene-preview" key={`${adventure?.id}-${sceneIndex}`}><p className="infernal-eyebrow">{adventure?.name}</p><h3>{scene.place}</h3><p className="infernal-narration">{scene.narration}</p></article> : <article className="infernal-scene-preview"><h3>La próxima página</h3><p className="infernal-narration">Elige una aventura para preparar la escena que verá la compañía.</p></article>}
          <div className="infernal-publication">
            <button className="btn infernal-seal" disabled={!available || !scene || !!combat || !!combatError} onClick={() => void publishScene()}><span className="infernal-seal-mark" aria-hidden="true">J</span><span>{pending === 'escena' ? 'Compartiendo…' : publishedHere ? 'Volver a compartir escena' : 'Compartir escena con todos'}<small>La compañía recibe esta página</small></span></button>
            <button className="infernal-text-button" disabled={!available || !scene || sceneIndex >= (adventure?.scenes.length ?? 0) - 1 || !!combat || !!combatError} onClick={() => void publishScene(sceneIndex + 1)}>Siguiente escena →</button>
            {combat && <p className="hint">Cierra el encuentro antes de llevar a la compañía a otra escena.</p>}
          </div>
          <section className="infernal-bestiary" aria-labelledby="director-bestiary-title"><div className="infernal-bestiary-title"><span aria-hidden="true">†</span><h4 id="director-bestiary-title">Criaturas de esta aventura</h4><span aria-hidden="true">†</span></div><div className="infernal-enemies">{adventure?.enemies.map((enemy) => <article key={enemy.name}><MonsterPortrait name={enemy.name} /><div><h4>{enemy.name}</h4><p>{enemy.hp} vida · Defensa {enemy.ac}</p><small>Ataque +{enemy.attack_bonus} · Daño {enemy.damage_dice}</small></div></article>)}</div>{!adventure?.enemies.length && <p className="hint">Esta aventura no tiene enemigos preparados.</p>}</section>
          <div className="infernal-folio" aria-hidden="true"><span />LA ESCENA<span /></div>
        </div>
      </section>
      <p className="infernal-trust">Vista de dirección para mesas de confianza. Acuerden quién será el Infernalista antes de comenzar.</p>

      <div className="infernal-support">
        <aside className="infernal-company" aria-labelledby="director-company-title">
          <div className="infernal-section-heading"><span className="infernal-step">II</span><div><p className="infernal-eyebrow">AL OTRO LADO DE LA MESA</p><h3 id="director-company-title">La compañía <span>{living.length}</span></h3></div></div>
          {!living.length && <p className="hint">Aún no hay héroes vivos. Abre la aventura y crea el primer personaje.</p>}
          <ul className="infernal-party-list">{living.map((character) => <li key={character.id}><CharacterPortrait species={character.species} profession={character.class_name} appearance={readAppearance(character.notes)} name={character.name} compact decorative className="character-avatar infernal-party-portrait" /><div><strong>{character.name}</strong><small>{character.class_name} · Nv. {character.level}</small><div className="hp-bar" role="meter" aria-label={`Vida de ${character.name}`} aria-valuemin={0} aria-valuemax={character.max_hp} aria-valuenow={Math.max(0, character.hp)}><div style={{ width: `${Math.max(0, Math.min(100, character.hp / Math.max(1, character.max_hp) * 100))}%` }} /></div></div><span className={character.hp <= 0 ? 'infernal-critical' : ''}>{character.hp}<small>/{character.max_hp}</small></span></li>)}</ul>
          <div className="infernal-world-law"><span aria-hidden="true">†</span><p>Una sola vida.<br /><small>Los héroes caídos permanecen en la historia. Su hoja y su nombre quedan sellados.</small></p></div>
        </aside>

        <section className="infernal-encounter" aria-labelledby="director-combat-title">
          <div className="infernal-section-heading"><span className="infernal-step">III</span><div><p className="infernal-eyebrow">EL PELIGRO TIENE ROSTRO</p><h3 id="director-combat-title">{combat ? 'El encuentro está vivo' : 'Prepara el encuentro'}</h3></div></div>
          {combat ? <>
            <div className="infernal-turn"><span>RONDA {combat.round}</span><p>Actúa <strong>{turn?.name ?? 'la compañía'}</strong></p></div>
            <ol className="infernal-initiative">{combat.combatants.map((fighter, index) => {
              const character = fighter.kind === 'pc' ? characters.find((item) => item.id === fighter.ref_id) : undefined;
              return <li key={fighter.ref_id} className={`${index === combat.turn_index % combat.combatants.length ? 'is-current' : ''} ${fighter.hp <= 0 || fighter.away ? 'is-down' : ''}`} aria-current={index === combat.turn_index % combat.combatants.length ? 'step' : undefined}><span className="infernal-initiative-value">{fighter.initiative}</span>{fighter.kind === 'enemy' ? <MonsterPortrait name={fighter.name} /> : character ? <CharacterPortrait species={character.species} profession={character.class_name} appearance={readAppearance(character.notes)} name={character.name} compact decorative className="character-avatar infernal-initiative-character" /> : <span className="character-avatar" aria-hidden="true">{fighter.name.slice(0, 1)}</span>}<strong>{fighter.name}{fighter.away && <em className="away-tag">En la retaguardia</em>}</strong><span>{Math.max(0, fighter.hp)}<small>/{fighter.max_hp} vida</small></span></li>;
            })}</ol>
            <div className="infernal-publish-row"><button className="btn btn-primary" disabled={!available || !!combatError || !combat.combatants.some((fighter) => fighter.hp > 0)} onClick={() => void changeTurn()}>Siguiente turno →</button><button className="btn" onClick={onOpenPlay}>Resolver acciones</button></div>
            {!confirmEnd ? <button className="infernal-text-button" disabled={!available || !!combatError} onClick={() => setConfirmEnd(true)}>Cerrar encuentro</button> : <div className="infernal-confirm"><p>El encuentro terminará para toda la mesa. La vida de los personajes se conserva.</p><button className="btn btn-danger" disabled={!available || !!combatError} onClick={() => void changeTurn(true)}>Confirmar cierre</button><button className="btn" disabled={!!pending} onClick={() => setConfirmEnd(false)}>Seguir jugando</button></div>}
          </> : <>
            <p className="infernal-encounter-intro">{adventure?.name ?? 'Elige una aventura'}</p>
            <p className="hint">La iniciativa ordena quién actúa primero. Los personajes y las criaturas entran en el mismo encuentro.</p>
            <button className="btn btn-danger" disabled={!available || !!combatError || !adventure?.enemies.length || !living.some((character) => character.hp > 0) || !publishedHere} onClick={() => void startEncounter()}>{pending === 'combate' ? 'Abriendo encuentro…' : 'Abrir encuentro y tirar iniciativa'}</button>
            {!publishedHere && <p className="hint">Comparte primero la escena para reunir a todos en la misma aventura.</p>}
          </>}
        </section>

        <section className="infernal-twists" aria-labelledby="director-twist-title"><div className="infernal-section-heading"><span className="infernal-step">IV</span><div><p className="infernal-eyebrow">CUANDO EL MUNDO RESPONDE</p><h3 id="director-twist-title">Un giro en la historia</h3></div></div><div className="infernal-twist-options">{TWISTS.map((event, index) => <button key={event.title} aria-pressed={twist === index} className={twist === index ? 'is-selected' : ''} disabled={!!pending} onClick={() => setTwist(index)}>{event.title}</button>)}</div><blockquote>{TWISTS[twist].body}</blockquote><button className="btn" disabled={!available} onClick={() => void publishTwist()}>{pending === 'evento' ? 'Compartiendo…' : 'Compartir acontecimiento'}</button><p className="hint">Quedará en los acontecimientos del mundo y en la actividad de la mesa.</p></section>
      </div>
    </div>
  );
}
