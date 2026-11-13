// Sección Jugar: un solo recorrido lineal guiado.
// Escena arriba, pregunta "¿Qué haces?" con opciones grandes, resultado en
// palabras simples, botón Continuar. Combate con enemigos precargados.
import { playSound } from '../lib/audio';
import { combatLogText } from '../lib/combatEffects';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import './PlayAtmosphere.css';
import {
  supabase,
  saveRoll,
  type World,
  type CharacterRow,
  type CombatRow,
  type Combatant,
} from '../lib/supabase';
import { ADVENTURES_SEED } from '../lib/compendium';
import MonsterPortrait from './MonsterPortrait';
import CharacterPortrait from './CharacterPortrait';
import CombatBoard from './CombatBoard';
import { COMBAT_COLS, COMBAT_ROWS, moveCombatant } from '../lib/boardCombat';
import { readAppearance } from '../lib/appearance';
import { ABSENCE_GRACE_MS, absentCombatants, nextTurn as advanceTurn, playerKey, rejoin, withdraw } from '../lib/rearguard';
import { useCombatActions } from '../hooks/useCombatActions';
import { clearDeathSaves, readDeathSaves, resolveDeathSave, writeDeathSaves } from '../lib/deathSaves.ts';
import {
  SKILLS,
  abilityMod,
  proficiencyBonus,
  rollDie,
} from '../lib/data';

interface PlayProps {
  world: World | null;
  characters: CharacterRow[];
  schemaOk: boolean;
  playerName: string;
  onCharactersChange: () => void;
  onCreateCharacter?: () => void;
  onOpenMap?: () => void;
  /** Nombres de los jugadores conectados ahora mismo a la mesa. */
  presentNames?: string[];
  presenceConnected?: boolean;
  sharedScene?: { id: string; adventureId: string; sceneIndex: number; place: string; narration: string; director: string } | null;
}

interface Scene {
  place: string;
  narration: string;
}

interface Adv {
  id: string;
  name: string;
  durationLabel: string;
  description: string;
  scenes: Scene[];
  enemies: { name: string; hp: number; ac: number; attack_bonus: number; damage_dice: string }[];
}

const DC_EXPLORAR = 12;
const NOBODY: string[] = [];

const EXPLORATION_ACTIONS = [
  { skill: 'Percepción', label: 'Mirar', title: 'Mirar a mi alrededor', detail: 'Observa lo que otros pasan por alto.', icon: 'eye' },
  { skill: 'Persuasión', label: 'Hablar', title: 'Hablar con alguien', detail: 'Una palabra puede abrir un camino.', icon: 'voice' },
  { skill: 'Sigilo', label: 'Moverse sin ruido', title: 'Moverme sin ruido', detail: 'Deja que las sombras te acompañen.', icon: 'steps' },
  { skill: 'Investigación', label: 'Buscar pistas', title: 'Buscar pistas', detail: 'Todo lugar guarda una historia.', icon: 'search' },
] as const;

function ActionIcon({ kind }: { kind: string }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'eye' && <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>}
    {kind === 'voice' && <><path d="M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 18 0Z" /><path d="M7 9h8M7 13h5" /></>}
    {kind === 'steps' && <><path d="M10 3C5 3 4 9 7 12l4-2c-1-3 2-6-1-7ZM14 11c5 0 6 6 3 9l-4-2c1-3-2-6 1-7ZM8 15l3-1 1 3-3 1M13 21l3 1" /></>}
    {kind === 'search' && <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6M10 7v6M7 10h6" /></>}
    {kind === 'path' && <><path d="M4 21h5l-3-6 6-5-2-7h10M16 1l4 2-4 2" /></>}
    {kind === 'swords' && <><path d="m4 3 4 1 12 13-3 3L4 7 4 3ZM3 19l3 2M4 20l4-4M20 3l-4 1-4 4M20 3v4l-4 4M16 16l5 5M18 21l3-3" /></>}
  </svg>;
}

function atmosphereFor(place: string, narration: string): 'ember' | 'mist' | 'moon' {
  const text = `${place} ${narration}`.toLocaleLowerCase('es');
  if (/fuego|llamas|humo|arde|calor|brasa/.test(text)) return 'ember';
  if (/agua|río|mar|niebla|lluvia|inund|hielo/.test(text)) return 'mist';
  return 'moon';
}

function sceneArtwork(adventureName: string, place: string): string {
  const text = `${adventureName} ${place}`.toLocaleLowerCase('es');
  if (/taberna|bodega|llamas/.test(text)) return '/art/tavern-interior.webp';
  if (/bosque|lindero|druida/.test(text)) return '/maps/bosque-sylmora.webp';
  if (/mina|túnel|veta/.test(text)) return '/maps/minas-brunnak.webp';
  if (/cripta|cementerio|sarcófago/.test(text)) return '/maps/templo-generico.webp';
  if (/trono/.test(place.toLocaleLowerCase('es'))) return '/maps/trono-vacio.webp';
  if (/montaña|piedra|recuerdos/.test(text)) return '/maps/salon-brunnak.webp';
  if (/faro|acantilado|linterna/.test(text)) return '/art/world-gate.webp';
  if (/valle|sueños/.test(text)) return '/maps/sopor.webp';
  if (/plaza|campana|goblin/.test(text)) return '/art/world-gate.webp';
  if (/circo|carpa|jaula/.test(text)) return '/art/world-gate.webp';
  return '/art/world-gate.webp';
}

function skillMod(c: CharacterRow, skillName: string): number {
  const skill = SKILLS.find((s) => s.name === skillName);
  if (!skill) return 0;
  const ab = { FUE: c.str, DES: c.dex, CON: c.con, INT: c.int, WIS: c.wis, CHA: c.cha } as Record<string, number>;
  const base = abilityMod(ab[skill.ability] ?? 10);
  const prof = c.skills.includes(skillName) ? proficiencyBonus(c.level) : 0;
  return base + prof;
}

export default function Play({ world, characters, schemaOk, playerName, onCharactersChange, onCreateCharacter, onOpenMap, sharedScene, presentNames = NOBODY, presenceConnected = false }: PlayProps) {
  const [adventures, setAdventures] = useState<Adv[]>(ADVENTURES_SEED.map((a, i) => ({ ...a, id: `seed-${i}` })));
  const [adventureError, setAdventureError] = useState<string | null>(null);
  const [advId, setAdvId] = useState<string>(() => localStorage.getItem('jth_adv') ?? '');
  const [sceneIdx, setSceneIdx] = useState<number>(() => parseInt(localStorage.getItem('jth_scene') ?? '0', 10) || 0);
  const [charId, setCharId] = useState<string>(() => localStorage.getItem('jth_char') ?? '');
  const [resultState, setResultState] = useState<{ message: string | null; sceneId: string | null }>({ message: null, sceneId: null });
  const result = resultState.sceneId === (sharedScene?.id ?? null) ? resultState.message : null;
  function setResult(message: string | null) {
    setResultState({ message, sceneId: sharedScene?.id ?? null });
  }
  const [combat, setCombat] = useState<CombatRow | null>(null);
  const [fallForm, setFallForm] = useState<string | null>(null);
  const [legacyKind, setLegacyKind] = useState<'tumba' | 'cancion' | 'leyenda' | 'objeto' | 'lugar'>('leyenda');
  const [legacyTitle, setLegacyTitle] = useState('');
  const [legacyBody, setLegacyBody] = useState('');
  const writeInProgress = useRef(false);
  const deathSaveInProgress = useRef(new Set<string>());

  const living = useMemo(() => characters.filter((c) => c.status === 'vivo'), [characters]);
  const activeChar = useMemo(
    () => living.find((c) => c.id === charId) ?? living[0] ?? null,
    [living, charId],
  );
  const characterById = useMemo(() => new Map(characters.map((character) => [character.id, character])), [characters]);
  const ownerById = useMemo(() => new Map(characters.map((character) => [character.id, character.owner_name])), [characters]);
  // Desde cuándo falta cada jugador. Solo se confía en la lista mientras esta
  // pestaña sigue conectada: sin conexión no sabemos quién está y quién no.
  const absentSince = useRef(new Map<string, number>());
  useEffect(() => {
    if (!presenceConnected) { absentSince.current.clear(); return; }
    const present = new Set(presentNames.map(playerKey));
    const now = Date.now();
    for (const owner of new Set(characters.map((character) => playerKey(character.owner_name)))) {
      if (!owner || present.has(owner)) absentSince.current.delete(owner);
      else if (!absentSince.current.has(owner)) absentSince.current.set(owner, now);
    }
  }, [presentNames, presenceConnected, characters]);
  function overdueAbsences(combatants: Combatant[]): string[] {
    if (!presenceConnected) return [];
    const now = Date.now();
    return absentCombatants(combatants, ownerById, presentNames)
      .filter(({ owner }) => now - (absentSince.current.get(owner) ?? now) >= ABSENCE_GRACE_MS)
      .map(({ refId }) => refId);
  }
  const selectedAdventureId = sharedScene?.adventureId ?? advId;
  const adventure = useMemo(
    () => adventures.find((a) => a.id === selectedAdventureId) ?? (sharedScene ? null : adventures[0]) ?? null,
    [adventures, selectedAdventureId, sharedScene],
  );
  const worldId = world?.id;
  const currentSceneIndex = Math.max(0, sharedScene?.sceneIndex ?? sceneIdx);
  const scene = sharedScene ?? adventure?.scenes[Math.min(currentSceneIndex, adventure.scenes.length - 1)];
  const atmosphere = atmosphereFor(scene?.place ?? '', scene?.narration ?? '');
  const sceneKey = sharedScene?.id ?? `${adventure?.id}-${currentSceneIndex}`;

  const combatActions = useCombatActions({
    combat, setCombat, worldId: world?.id ?? null, schemaOk, playerName, characters, onCharactersChange, setResult, adventures, adventure,
  });
  const { pending: combatPending, currentTurn, nextTurn, pcAttack, enemyAttack, endCombat } = combatActions;


  useEffect(() => {
    if (!schemaOk || !worldId) return;
    const controller = new AbortController();
    void (async () => {
      const { data, error } = await supabase
        .from('adventures')
        .select('id,name,duration_label,description,scenes(place,narration),enemies(name,hp,ac,attack_bonus,damage_dice)')
        .eq('world_id', worldId)
        .order('duration', { ascending: true })
        .order('position', { referencedTable: 'scenes', ascending: true })
        .abortSignal(controller.signal);
      if (controller.signal.aborted) return;
      if (error || !data?.length) {
        setAdventureError(worldId);
        return;
      }
      setAdventureError(null);
      setAdventures(data.map((row) => ({
        id: row.id,
        name: row.name,
        durationLabel: row.duration_label,
        description: row.description ?? '',
        scenes: row.scenes,
        enemies: row.enemies,
      })));
    })();
    return () => controller.abort();
  }, [schemaOk, worldId]);

  // Recover the current encounter after reconnecting; events never play sound.
  useEffect(() => {
    if (!schemaOk || !worldId) return;
    const controller = new AbortController();
    let revision = 0;
    async function refresh() {
      const observedRevision = revision;
      const { data, error } = await supabase
        .from('combat')
        .select('*')
        .eq('world_id', worldId)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .abortSignal(controller.signal)
        .maybeSingle();
      if (!controller.signal.aborted && !error && observedRevision === revision) setCombat(data as CombatRow | null);
    }
    void refresh();
    const ch = supabase
      .channel(`jth-combat-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combat', filter: `world_id=eq.${worldId}` }, (payload) => {
        revision++;
        const row = (payload.new ?? payload.old) as CombatRow;
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') setCombat(row);
        if (payload.eventType === 'DELETE') void refresh();
      })
      .subscribe((status) => { if (status === 'SUBSCRIBED') void refresh(); });
    const onVisible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      controller.abort();
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(ch);
    };
  }, [schemaOk, worldId]);
  useEffect(() => {
    localStorage.setItem('jth_scene', String(sceneIdx));
  }, [sceneIdx]);
  useEffect(() => {
    if (activeChar) localStorage.setItem('jth_char', activeChar.id);
  }, [activeChar]);

  async function runCombatAction(action: () => Promise<void>) {
    if (writeInProgress.current) return;
    writeInProgress.current = true;
    try {
      await combatActions.runAction(action);
    } finally {
      writeInProgress.current = false;
    }
  }

  async function rollSkill(skillName: string, label: string) {
    if (!activeChar) return;
    const mod = skillMod(activeChar, skillName);
    const d20 = rollDie(20);
    const total = d20 + mod;
    const ok = total >= DC_EXPLORAR;
    const verdict = ok
      ? `¡Lo lograste! El dado sacó ${d20} y con tu bono queda ${total}. Necesitabas ${DC_EXPLORAR} o más.`
      : `No alcanza. El dado sacó ${d20} y con tu bono queda ${total}. Necesitabas ${DC_EXPLORAR} o más.`;
    const story = ok
      ? 'Descubres algo útil: un detalle, una pista o un camino que no se veía antes.'
      : 'No encuentras nada esta vez. El lugar guarda su secreto… por ahora.';
    setResult(`${verdict} ${story}`);
    playSound(ok ? 'success' : 'failure');
    await saveRoll({
      world_id: world?.id ?? null,
      player_name: playerName,
      character_name: activeChar.name,
      label: `${label} de ${activeChar.name}`,
      dice: `1d20${mod >= 0 ? '+' : ''}${mod}`,
      result: total,
      detail: `Dado ${d20} + bono ${mod} · dificultad ${DC_EXPLORAR}`,
    });
  }

  async function startCombat() {
    if (!adventure || living.length === 0 || !schemaOk || !world) return;
    const combatants: Combatant[] = [
      ...living.map((c) => ({
        kind: 'pc' as const,
        ref_id: c.id,
        name: c.name,
        initiative: rollDie(20) + abilityMod(c.dex),
        hp: c.hp,
        max_hp: c.max_hp,
        ac: c.ac,
      })),
      ...adventure.enemies.map((e, i) => ({
        kind: 'enemy' as const,
        ref_id: `enemy-${i}`,
        name: e.name,
        initiative: rollDie(20),
        hp: e.hp,
        max_hp: e.hp,
        ac: e.ac,
      })),
    ].sort((a, b) => b.initiative - a.initiative);
    // Quien lleva un rato fuera de la mesa empieza a salvo en la retaguardia,
    // siempre que quede alguien en el frente para pelear.
    const overdue = new Set(overdueAbsences(combatants));
    const waiting = combatants.filter((item) => overdue.has(item.ref_id));
    const startsAway = waiting.length > 0 && combatants.some((item) => item.kind === 'pc' && item.hp > 0 && !overdue.has(item.ref_id));
    if (startsAway) for (const item of waiting) item.away = true;
    const first = startsAway && combatants[0].away ? advanceTurn(combatants, 0, 1)?.turn_index ?? 0 : 0;
    const row: CombatRow = {
      id: crypto.randomUUID(),
      world_id: world?.id ?? null,
      adventure_id: adventure.id.startsWith('seed-') ? null : adventure.id,
      active: true,
      round: 1,
      turn_index: first,
      combatants,
      log: [`¡Empieza la pelea en ${adventure.name}!`, ...(startsAway ? [`${waiting.map((item) => item.name).join(', ')} espera en la retaguardia hasta que su jugador vuelva.`] : [])],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setResult(null);
    if (schemaOk && world) {
      const { data, error } = await supabase.from('combat').insert({
        id: row.id,
        world_id: world.id,
        adventure_id: row.adventure_id,
        active: true,
        round: 1,
        turn_index: first,
        combatants,
        log: row.log,
      }).select('*').single();
      if (error || !data) {
        setResult('No se pudo iniciar la pelea. Inténtalo de nuevo.');
        playSound('failure');
        return;
      }
      setCombat(data as CombatRow);
    }
    playSound('combat');
  }

  // Mis personajes en este combate: los que creé con mi nombre de jugador.
  const me = playerKey(playerName);
  const mine = (combat?.active ? combat.combatants : []).filter((item) => item.kind === 'pc' && !!me && playerKey(ownerById.get(item.ref_id)) === me);
  const mineAtFront = mine.filter((item) => !item.away);
  const mineAway = mine.filter((item) => item.away);

  async function leaveTable() {
    if (!combat) return;
    let next = combat;
    for (const item of mineAtFront) next = withdraw(next, item.ref_id) ?? next;
    if (next === combat || !await combatActions.persistCombat(next)) return;
    setResult('Tu personaje espera a salvo en la retaguardia. La mesa sigue sin ti; cuando vuelvas, pulsa «Volver al frente».');
    playSound('page');
  }

  async function returnToTable() {
    if (!combat) return;
    let next = combat;
    for (const item of mineAway) next = rejoin(next, item.ref_id) ?? next;
    if (next === combat || !await combatActions.persistCombat(next)) return;
    setResult('Has vuelto al frente. Actuarás cuando llegue tu turno.');
    playSound('select');
  }

  // Retirada automática: si un jugador lleva un rato desconectado, cualquier
  // pestaña que siga en la mesa pone a su personaje a salvo. Si dos lo intentan
  // a la vez, solo se guarda una vez y la otra se actualiza en silencio.
  useEffect(() => {
    if (!combat?.active || !presenceConnected) return;
    const check = async () => {
      if (writeInProgress.current) return;
      const overdue = overdueAbsences(combat.combatants);
      if (!overdue.length) return;
      let next = combat;
      for (const refId of overdue) next = withdraw(next, refId, true) ?? next;
      if (next === combat) return;
      writeInProgress.current = true;
      try { await combatActions.persistCombat(next, undefined, undefined, true); } catch { /* Se reintenta en la próxima comprobación. */ } finally { writeInProgress.current = false; }
    };
    const timer = window.setInterval(() => { void check(); }, 5000);
    return () => window.clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat, presenceConnected, presentNames, ownerById]);

  async function deathSave(char: CharacterRow) {
    const saves = readDeathSaves(char.notes);
    if (!schemaOk || char.status !== 'vivo' || char.hp > 0 || saves.successes >= 3 || saves.failures >= 3 || deathSaveInProgress.current.has(char.id)) return;
    deathSaveInProgress.current.add(char.id);
    const d20 = rollDie(20);
    try {
      const resolution = resolveDeathSave(saves, d20);
      const nextNotes = resolution.recovered ? clearDeathSaves(char.notes) : writeDeathSaves(char.notes, resolution.saves);
      let query = supabase.from('characters')
        .update({ hp: resolution.recovered ? 1 : 0, notes: nextNotes })
        .eq('id', char.id).eq('status', 'vivo').eq('hp', 0);
      query = char.notes === null ? query.is('notes', null) : query.eq('notes', char.notes);
      const { data, error } = await query.select('id').maybeSingle();
      if (error || !data) {
        setResult(error
          ? 'No se pudo guardar la tirada. Revisa la conexión y el estado actual del personaje.'
          : 'La hoja cambió en otra sesión. Se actualizó la compañía; revisa antes de volver a tirar.');
        onCharactersChange();
        return;
      }
      const msg = resolution.recovered
        ? `¡Un 20! ${char.name} se levanta con 1 punto de vida. ¡Está de vuelta!`
        : d20 === 1
          ? `Un 1… mala suerte: ${char.name} suma dos fallos. Lleva ${resolution.saves.failures} de 3 fallos.`
          : d20 >= 10
            ? `${char.name} saca ${d20}: un éxito. Lleva ${resolution.saves.successes} de 3 éxitos.`
            : `${char.name} saca ${d20}: un fallo. Lleva ${resolution.saves.failures} de 3 fallos.`;
      setResult(resolution.recovered
        ? msg
        : resolution.saves.successes >= 3
          ? `${msg} ¡Se estabiliza! ${char.name} no muere, pero sigue inconsciente hasta que alguien lo cure.`
          : resolution.saves.failures >= 3
            ? `${char.name} ha acumulado tres fallos. Registra su caída para que el mundo lo recuerde.`
            : msg);
      if (resolution.saves.failures >= 3) setFallForm(char.id);
      await saveRoll({
        world_id: world?.id ?? null,
        player_name: playerName,
        character_name: char.name,
        label: `Tirada para no morir de ${char.name}`,
        dice: '1d20',
        result: d20,
        detail: msg,
      });
      onCharactersChange();
    } finally {
      deathSaveInProgress.current.delete(char.id);
    }
  }

  async function registerFall(char: CharacterRow) {
    if (!schemaOk) return;
    let query = supabase
      .from('characters')
      .update({ status: 'caido', hp: 0, death_note: `Cayó en ${adventure?.name ?? 'el mundo'}.`, notes: clearDeathSaves(char.notes) })
      .eq('id', char.id).eq('status', 'vivo').eq('hp', 0);
    query = char.notes === null ? query.is('notes', null) : query.eq('notes', char.notes);
    const { data, error } = await query.select('id').maybeSingle();
    if (error || !data) {
      setResult('No se pudo registrar la caída. Inténtalo de nuevo.');
      playSound('failure');
      return;
    }
    playSound('death');
    onCharactersChange();
    setFallForm(char.id);
  }

  async function saveLegacy(char: CharacterRow) {
    if (!schemaOk || !legacyTitle.trim()) return;
    await supabase.from('legacies').insert({
      world_id: world?.id ?? null,
      character_id: char.id,
      character_name: char.name,
      kind: legacyKind,
      title: legacyTitle.trim(),
      body: legacyBody.trim() || 'El mundo recuerda a este héroe.',
      place: scene?.place ?? null,
    });
    setFallForm(null);
    setLegacyTitle('');
    setLegacyBody('');
    setResult(`Los restos de ${char.name} quedan en el mundo: "${legacyTitle.trim()}". Los próximos héroes podrán encontrarlo.`);
  }

  const turn = currentTurn();
  const fallen = characters.filter((c) => c.status === 'caido');
  const dying = characters.filter((c) => c.status === 'vivo' && c.hp <= 0);

  return (
    <div className="play-panel living-play" data-atmosphere={atmosphere}>
      {!schemaOk && (
        <div className="banner-warning" role="status">
          No pudimos conectar con el mundo. Puedes explorar las aventuras y volver a cargar la página para intentarlo de nuevo.
        </div>
      )}

      {adventureError && adventureError === worldId && (
        <p className="banner-warning" role="status">No se pudieron cargar las aventuras del mundo. Puedes explorar las aventuras incluidas en el juego.</p>
      )}

      <div className="journey-toolbar">
        <div className="journey-mode"><span className="journey-signal" aria-hidden="true" />
          {sharedScene ? `Dirige ${sharedScene.director || 'el Infernalista'}` : 'Tu aventura, paso a paso'}
        </div>
        <details className="journey-settings">
          <summary>Preparar mi aventura <span aria-hidden="true">⌄</span></summary>
          <div className="journey-settings-content">
            <label>Aventura
              <select disabled={!!sharedScene || !!combat?.active} value={adventure?.id ?? ''} onChange={(event) => {
                setAdvId(event.target.value);
                localStorage.setItem('jth_adv', event.target.value);
                setSceneIdx(0);
                setResult(null);
                playSound('page');
              }}>
                {!adventure && <option value="">Cargando aventura compartida…</option>}
                {adventures.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.durationLabel}</option>)}
              </select>
            </label>
            <label>Tu personaje
              <select value={activeChar?.id ?? ''} onChange={(event) => setCharId(event.target.value)}>
                {living.length === 0 && <option value="">Sin personaje vivo</option>}
                {living.map((character) => <option key={character.id} value={character.id}>{character.name} · {character.class_name}</option>)}
              </select>
            </label>
            {sharedScene && <p className="hint">El Infernalista elige el siguiente lugar para toda la mesa.</p>}
          </div>
        </details>
      </div>

      {scene && (
        <section key={sceneKey} className={`scene-stage ${combat?.active ? 'scene-stage-combat' : ''}`} style={{ '--scene-art': `url("${sceneArtwork(adventure?.name ?? '', scene.place)}")` } as CSSProperties} aria-labelledby="scene-title">
          <div className="stage-art" aria-hidden="true" />
          <div className="stage-frame" aria-hidden="true" />
          <div className="stage-haze" aria-hidden="true" />
          <div className="stage-embers" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} style={{ '--particle': index } as CSSProperties} />)}</div>
          <div className="stage-topline">
            <span className="stage-location"><span aria-hidden="true">◇</span> {adventure?.name ?? 'La mesa compartida'}</span>
            <span className={`stage-state ${combat?.active ? 'is-combat' : ''}`}>{combat?.active ? `En combate · ronda ${combat.round}` : 'Exploración'}</span>
          </div>
          <div className="stage-story">
            <p className="stage-overline">{sharedScene ? 'La voz del Infernalista' : 'El siguiente capítulo empieza contigo'}</p>
            <h2 id="scene-title">{scene.place}</h2>
            <div className="stage-rule" aria-hidden="true"><span /></div>
            <p className="stage-narration">{scene.narration}</p>
            {onOpenMap && <button className="stage-map-link" onClick={onOpenMap}><ActionIcon kind="path" /> Abrir mesa de batalla <span aria-hidden="true">↗</span></button>}
          </div>
          <div className="stage-bottomline">
            <div className="journey-chapters" aria-label="Progreso de la aventura">
              <span>Escena <b>{Math.min(currentSceneIndex + 1, adventure?.scenes.length || currentSceneIndex + 1).toString().padStart(2, '0')}</b><small> / {(adventure?.scenes.length || currentSceneIndex + 1).toString().padStart(2, '0')}</small></span>
              <div className="chapter-track" aria-hidden="true">{(adventure?.scenes ?? [scene]).map((_, index) => <i key={index} className={index <= currentSceneIndex ? 'chapter-reached' : ''} />)}</div>
            </div>
            {activeChar ? <div className="stage-character">
              <CharacterPortrait species={activeChar.species} profession={activeChar.class_name} appearance={readAppearance(activeChar.notes)} name={activeChar.name} compact decorative className="character-avatar stage-character-portrait" />
              <div><b>{activeChar.name}</b><span>{activeChar.class_name} · Nivel {activeChar.level}</span></div>
              <div className="stage-health"><b>{activeChar.hp}<small> / {activeChar.max_hp}</small></b><span>Vida · Defensa {activeChar.ac}</span></div>
            </div> : <span className="stage-invitation">El mundo espera tu primera decisión.</span>}
          </div>
        </section>
      )}

      {result && (
        <div key={result} className="card result-card living-result" role="status">
          <span className="result-mark" aria-hidden="true">◇</span>
          <div><p className="result-eyebrow">El mundo responde</p><p>{result}</p></div>
          {!combat?.active && <button className="btn" onClick={() => setResult(null)}>Entendido</button>}
        </div>
      )}

      {!activeChar && <section className="journey-invitation">
        <div><p className="stage-overline">Una vida. Una historia.</p><h2>Haz que el mundo recuerde tu nombre.</h2><p>Elige quién eres y entra en la aventura. Solo necesitas escribir tu nombre.</p></div>
        {onCreateCharacter && <button className="btn btn-primary" onClick={onCreateCharacter}>Crear mi personaje <span aria-hidden="true">→</span></button>}
      </section>}

      {!combat?.active && activeChar && (
        <section className="journey-actions" aria-labelledby="action-title">
          <div className="journey-action-heading"><div><p className="stage-overline">Tu decisión cambia la historia</p><h2 id="action-title">¿Qué haces?</h2></div><span>Prueba de 20 caras · Dificultad 12</span></div>
          <div className="exploration-actions">
            {EXPLORATION_ACTIONS.map((action) => <button key={action.skill} className="exploration-action" onClick={() => rollSkill(action.skill, action.label)}>
              <span className="action-icon"><ActionIcon kind={action.icon} /></span>
              <span><b>{action.title}</b><small>{action.detail}</small></span><span className="action-arrow" aria-hidden="true">↗</span>
            </button>)}
          </div>
          <div className="journey-next">
            <button className="btn journey-continue" disabled={!!sharedScene || !adventure || currentSceneIndex >= adventure.scenes.length - 1} onClick={() => {
              playSound('page');
              setSceneIdx((index) => Math.min(index + 1, (adventure?.scenes.length ?? 1) - 1));
              setResult(null);
            }}><ActionIcon kind="path" /><span>{sharedScene ? 'El Infernalista guía el camino' : adventure && currentSceneIndex >= adventure.scenes.length - 1 ? 'Has llegado al final del recorrido' : 'Seguir adelante'}</span><span aria-hidden="true">→</span></button>
            <button className="btn btn-danger" disabled={combatPending || !schemaOk || !adventure} onClick={() => runCombatAction(startCombat)}><ActionIcon kind="swords" />{combatPending ? 'Preparando…' : 'Entrar en combate'}</button>
          </div>
        </section>
      )}

      {!combat?.active && adventure && adventure.enemies.length > 0 && (
        <details className="encounter-panel living-encounters">
          <summary className="encounter-disclosure">
            <span className="encounter-summary-text"><span className="stage-overline">No estás solo aquí</span><span className="encounter-heading">Enemigos de esta aventura</span></span>
            <span className="encounter-summary-portraits" aria-hidden="true">{adventure.enemies.slice(0, 3).map((enemy) => <MonsterPortrait key={enemy.name} name={enemy.name} className="encounter-preview-portrait" />)}</span>
            <span className="encounter-count">{adventure.enemies.length} presencias</span><span className="encounter-toggle" aria-hidden="true">⌄</span>
          </summary>
          <div className="encounter-list">
            {adventure.enemies.map((enemy) => (
              <article key={enemy.name} className="encounter-card living-enemy">
                <MonsterPortrait name={enemy.name} className="encounter-portrait" />
                <div>
                  <h3>{enemy.name}</h3>
                  <p><span>{enemy.hp} <small>vida</small></span><span>{enemy.ac} <small>defensa</small></span></p><span className="enemy-weapon">Daño {enemy.damage_dice} · Ataque +{enemy.attack_bonus}</span>
                </div>
              </article>
            ))}
          </div>
        </details>
      )}

      {/* Combate */}
      {combat?.active && (
        <div className="card combat-card living-combat" aria-busy={combatPending}>
          <p className="stage-overline">Cada decisión cuenta</p><h2>Combate en {adventure?.name}</h2>
          <p className="hint">Ronda {combat.round} · Turno de: <b>{turn?.name ?? '—'}</b></p>
          <CombatBoard combat={combat} characters={characters} art={scene ? sceneArtwork(adventure?.name ?? '', scene.place) : undefined} busy={combatPending}
            onMove={(refId, x, y) => void runCombatAction(async () => {
              const next = moveCombatant(combat, refId, x, y, COMBAT_COLS, COMBAT_ROWS);
              if (next && await combatActions.persistCombat(next)) playSound('move');
            })}
            onAttack={(attackerRefId, targetRefId) => void runCombatAction(() => pcAttack(targetRefId, attackerRefId))}
            onEnemyAttack={(enemyRefId) => void runCombatAction(() => enemyAttack(enemyRefId))} />
          <div className="combatants">
            {combat.combatants.map((c, i) => (
              <div key={c.ref_id} className={`combatant ${i === combat.turn_index % combat.combatants.length ? 'active-turn' : ''} ${c.hp <= 0 ? 'down' : ''} ${c.away ? 'away' : ''}`}>
                {c.kind === 'enemy' ? (
                  <MonsterPortrait name={c.name} className="combat-portrait" />
                ) : (() => {
                  const character = characterById.get(c.ref_id);
                  return character
                    ? <CharacterPortrait species={character.species} profession={character.class_name} appearance={readAppearance(character.notes)} weapon={character.weapon} armor={character.armor} shield={character.shield} pack={character.pack} name={character.name} compact decorative className="character-avatar combat-portrait-character" />
                    : <span className="character-avatar" aria-hidden="true">{c.name.charAt(0)}</span>;
                })()}
                <div className="combatant-info">
                  <b>{c.name}{c.away && <em className="away-tag">En la retaguardia</em>}</b>
                  <span>Vida {Math.max(0, c.hp)}/{c.max_hp} · Defensa {c.ac}</span>
                  <div className="hp-bar"><div style={{ width: `${(Math.max(0, c.hp) / Math.max(1, c.max_hp)) * 100}%` }} /></div>
                </div>
              </div>
            ))}
          </div>

          {(mineAtFront.length > 0 || mineAway.length > 0) && (
            <div className="rearguard-bar">
              {mineAway.length > 0
                ? <><p><b>{mineAway.map((item) => item.name).join(', ')}</b> espera en la retaguardia. Nadie puede atacarle mientras estés fuera.</p>
                  <button className="btn btn-primary" disabled={combatPending} onClick={() => runCombatAction(returnToTable)}>Volver al frente</button></>
                : <><p>¿Una emergencia? Tu personaje se pone a salvo y la mesa sigue sin ti.</p>
                  <button className="btn" disabled={combatPending} onClick={() => runCombatAction(leaveTable)}>Tengo que irme</button></>}
            </div>
          )}

          {turn?.kind === 'pc' && turn.away && (
            <div>
              <h3>{turn.name} está en la retaguardia</h3>
              <button className="btn btn-primary" disabled={combatPending} onClick={() => runCombatAction(nextTurn)}>Pasar turno →</button>
            </div>
          )}
          {turn?.kind === 'pc' && !turn.away && (
            <div>
              <h3>Tu turno, {turn.name}</h3>
              <div className="grid-actions">
                {combat.combatants.filter((c) => c.kind === 'enemy' && c.hp > 0).map((e) => (
                  <button key={e.ref_id} className="btn btn-action" disabled={combatPending} onClick={() => runCombatAction(() => pcAttack(e.ref_id, turn.ref_id))}>
                    Atacar a {e.name}
                  </button>
                ))}
                <button className="btn" onClick={() => setResult(`${turn.name} se defiende: hasta su próximo turno, los ataques contra él tienen desventaja.`)}>
                  Defenderme
                </button>
                <button className="btn btn-primary" disabled={combatPending} onClick={() => runCombatAction(nextTurn)}>Pasar turno →</button>
              </div>
            </div>
          )}
          {turn?.kind === 'enemy' && (
            <div>
              <h3>Turno del enemigo: {turn.name}</h3>
              <button className="btn btn-danger" disabled={combatPending} onClick={() => runCombatAction(() => enemyAttack(turn.ref_id))}>Que ataque</button>
              <button className="btn btn-primary" disabled={combatPending} onClick={() => runCombatAction(nextTurn)}>Pasar turno →</button>
            </div>
          )}

          <div className="combat-log">
            {combat.log.slice(-6).map((l, i) => (
              <p key={i}>• {combatLogText(l)}</p>
            ))}
          </div>
          <button className="btn" disabled={combatPending} onClick={() => runCombatAction(() => endCombat('La pelea termina. El grupo respira, se cura y sigue su camino.'))}>
            Terminar la pelea
          </button>
        </div>
      )}

      {/* Personajes a 0 de vida: tirada para no morir */}
      {dying.map((c) => {
        const saves = readDeathSaves(c.notes);
        const terminal = saves.successes >= 3 || saves.failures >= 3;
        const saving = deathSaveInProgress.current.has(c.id);
        return (
          <div key={c.id} className="card danger-card">
            <h3>{c.name} está a 0 de vida</h3>
            <p>Éxitos: {saves.successes}/3 · Fallos: {saves.failures}/3. Saca 10 o más para un éxito. Un 20 te levanta con 1 de vida. Un 1 son dos fallos.</p>
            <button className="btn btn-danger" disabled={!schemaOk || terminal || saving} onClick={() => void deathSave(c)}>
              {saving ? 'Guardando tirada…' : saves.successes >= 3 ? 'Estable; espera curación' : saves.failures >= 3 ? 'Registra la caída' : 'Tirar para no morir'}
            </button>
          </div>
        );
      })}

      {/* Registrar caída y legado */}
      {fallen.filter((c) => fallForm === c.id).map((c) => (
        <div key={c.id} className="card legacy-card">
          <h3>{c.name} ha caído</h3>
          <p>Su hoja queda sellada para siempre y su nombre no podrá volver a usarse. ¿Qué queda de él en el mundo?</p>
          <div className="chips">
            {(['tumba', 'cancion', 'leyenda', 'objeto', 'lugar'] as const).map((k) => (
              <button key={k} className={`chip ${legacyKind === k ? 'chip-selected' : ''}`} onClick={() => setLegacyKind(k)}>
                {k === 'tumba' ? 'Tumba' : k === 'cancion' ? 'Canción' : k === 'leyenda' ? 'Leyenda' : k === 'objeto' ? 'Objeto' : 'Lugar'}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Título del legado (ej. La canción de la taberna)"
            value={legacyTitle}
            onChange={(e) => setLegacyTitle(e.target.value)}
          />
          <textarea
            placeholder={legacyKind === 'cancion' ? 'Escribe la letra de la canción…' : 'Cuenta qué quedó de este héroe…'}
            value={legacyBody}
            onChange={(e) => setLegacyBody(e.target.value)}
            rows={3}
          />
          <button className="btn btn-primary" onClick={() => saveLegacy(c)}>Dejar su legado en el mundo</button>
        </div>
      ))}
      {dying.map((c) => (
        <div key={`reg-${c.id}`} className="card">
          <button className="btn btn-danger" onClick={() => registerFall(c)}>
            Registrar la caída de {c.name} (no hay vuelta atrás)
          </button>
        </div>
      ))}
    </div>
  );
}
