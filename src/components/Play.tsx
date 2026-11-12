// Sección Jugar: un solo recorrido lineal guiado.
// Escena arriba, pregunta "¿Qué haces?" con opciones grandes, resultado en
// palabras simples, botón Continuar. Combate con enemigos precargados.
import { playSound } from '../lib/audio';
import { combatLogText, publishLocalCombatEffect, type CombatAttackEvent } from '../lib/combatEffects';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import './PlayAtmosphere.css';
import {
  supabase,
  saveRoll,
  parseAndRoll,
  type World,
  type CharacterRow,
  type CombatRow,
  type Combatant,
} from '../lib/supabase';
import { ADVENTURES_SEED } from '../lib/compendium';
import MonsterPortrait from './MonsterPortrait';
import {
  SKILLS,
  WEAPONS,
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

export default function Play({ world, characters, schemaOk, playerName, onCharactersChange, onCreateCharacter, onOpenMap, sharedScene }: PlayProps) {
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
  const [deathSaves, setDeathSaves] = useState<Record<string, { ok: number; fail: number }>>({});
  const [fallForm, setFallForm] = useState<string | null>(null);
  const [legacyKind, setLegacyKind] = useState<'tumba' | 'cancion' | 'leyenda' | 'objeto' | 'lugar'>('leyenda');
  const [legacyTitle, setLegacyTitle] = useState('');
  const [legacyBody, setLegacyBody] = useState('');
  const [combatPending, setCombatPending] = useState(false);
  const writeInProgress = useRef(false);

  const living = useMemo(() => characters.filter((c) => c.status === 'vivo'), [characters]);
  const activeChar = useMemo(
    () => living.find((c) => c.id === charId) ?? living[0] ?? null,
    [living, charId],
  );
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
    setCombatPending(true);
    try {
      await action();
    } catch {
      setResult('No se pudo guardar la acción. Revisa tu conexión antes de volver a intentarlo.');
      playSound('failure');
    } finally {
      writeInProgress.current = false;
      setCombatPending(false);
    }
  }

  async function persistCombat(next: CombatRow, attackEvent?: CombatAttackEvent, attackerRefId?: string): Promise<boolean> {
    if (!schemaOk || !world) {
      setResult('Necesitas conexión con el mundo para guardar el combate.');
      return false;
    }
    if (attackEvent && !next.combatants.some((item) => item.ref_id === attackerRefId)) {
      setResult('El atacante ya no está en este combate. Revisa la mesa antes de continuar.');
      return false;
    }
    // Only the newly committed attack shares this timestamp. Turn changes leave
    // earlier event timestamps untouched so Realtime cannot replay them.
    const previousAt = Date.parse(combat?.updated_at ?? next.updated_at) || 0;
    const committedAt = new Date(Math.max(Date.now(), previousAt + 1)).toISOString();
    const committedAttack = attackEvent ? { ...attackEvent, at: committedAt } : null;
    const { data, error } = await supabase
      .from('combat')
      .update({
        round: next.round,
        turn_index: next.turn_index,
        combatants: committedAttack
          ? next.combatants.map((item) => item.ref_id === attackerRefId ? { ...item, last_attack: committedAttack } : item)
          : next.combatants,
        // Older clients render log entries directly, so this remains plain text.
        log: committedAttack ? [...next.log, committedAttack.message] : next.log,
        active: next.active,
        updated_at: committedAt,
      })
      .eq('id', next.id)
      .eq('world_id', world.id)
      .eq('active', true)
      .eq('updated_at', combat?.updated_at ?? next.updated_at)
      .select('*')
      .maybeSingle();
    if (!error && !data) {
      const { data: current } = await supabase.from('combat').select('*').eq('id', next.id).eq('world_id', world.id).maybeSingle();
      if (current) setCombat(current as CombatRow);
      setResult('La mesa cambió mientras actuabas. Revisa el turno actualizado y vuelve a elegir tu acción.');
      playSound('failure');
      return false;
    }
    if (error || !data) {
      setResult('No se pudo guardar la acción del combate. Inténtalo de nuevo.');
      playSound('failure');
      return false;
    }
    setCombat(data as CombatRow);
    if (committedAttack) publishLocalCombatEffect(committedAttack, world.id);
    return true;
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
    const row: CombatRow = {
      id: crypto.randomUUID(),
      world_id: world?.id ?? null,
      adventure_id: adventure.id.startsWith('seed-') ? null : adventure.id,
      active: true,
      round: 1,
      turn_index: 0,
      combatants,
      log: [`¡Empieza la pelea en ${adventure.name}!`],
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
        turn_index: 0,
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

  async function endCombat(msg: string, sound: 'success' | 'failure' | 'select' = 'select') {
    if (!combat) return;
    const next = { ...combat, active: false, log: [...combat.log, msg] };
    if (!await persistCombat(next)) return;
    setResult(msg);
    playSound(sound);
    if (schemaOk && world) {
      await supabase.from('journal_entries').insert({
        world_id: world.id,
        title: 'Batalla',
        body: msg,
        kind: 'cronica',
      });
    }
  }

  function currentTurn(): Combatant | null {
    if (!combat || combat.combatants.length === 0) return null;
    return combat.combatants[combat.turn_index % combat.combatants.length];
  }

  async function nextTurn() {
    if (!combat) return;
    const alive = combat.combatants.filter((c) => c.hp > 0);
    const pcsAlive = alive.some((c) => c.kind === 'pc');
    const enemiesAlive = alive.some((c) => c.kind === 'enemy');
    if (!pcsAlive) {
      await endCombat('Todos los héroes cayeron. El mundo sigue… y recordará esta derrota.', 'failure');
      return;
    }
    if (!enemiesAlive) {
      await endCombat('¡Victoria! Todos los enemigos cayeron. La aventura continúa.', 'success');
      return;
    }
    let idx = (combat.turn_index + 1) % combat.combatants.length;
    let guard = 0;
    while (combat.combatants[idx].hp <= 0 && guard < combat.combatants.length) {
      idx = (idx + 1) % combat.combatants.length;
      guard++;
    }
    const round = idx <= combat.turn_index ? combat.round + 1 : combat.round;
    if (await persistCombat({ ...combat, turn_index: idx, round })) playSound('select');
  }

  async function pcAttack(target: Combatant) {
    if (!combat || !activeChar) return;
    const turn = currentTurn();
    if (!turn || turn.kind !== 'pc') return;
    const attacker = characters.find((character) => character.id === turn.ref_id);
    if (!attacker || attacker.status !== 'vivo' || turn.hp <= 0) return;
    const weapon = WEAPONS.find((w) => w.name === attacker.weapon) ?? WEAPONS[0];
    const mod = abilityMod(attacker.str);
    const d20 = rollDie(20);
    const attack = d20 + proficiencyBonus(attacker.level) + mod;
    let logLine = '';
    let damage = 0;
    const combatants = combat.combatants.map((combatant) => ({ ...combatant }));
    if (attack >= target.ac) {
      const { total: rolledDamage, detail } = parseAndRoll(`${weapon.dice}${mod >= 0 ? '+' : ''}${mod}`);
      damage = Math.max(0, rolledDamage);
      const t = combatants.find((c) => c.ref_id === target.ref_id);
      if (t) t.hp = Math.max(0, t.hp - damage);
      logLine = `${attacker.name} ataca a ${target.name} con ${weapon.name}: saca ${d20} + bono = ${attack} contra defensa ${target.ac}. ¡Le pega! Daño ${damage} (${detail}).`;
      await saveRoll({
        world_id: world?.id ?? null,
        player_name: playerName,
        character_name: attacker.name,
        label: `Ataque de ${attacker.name} a ${target.name}`,
        dice: `1d20+${proficiencyBonus(attacker.level) + mod}`,
        result: attack,
        detail: `Dado ${d20} · defensa enemiga ${target.ac}`,
      });
    } else {
      logLine = `${attacker.name} ataca a ${target.name}: saca ${d20} + bono = ${attack} contra defensa ${target.ac}. ¡No le pega!`;
    }
    const attackEvent: CombatAttackEvent = {
      type: 'jth.attack.v1', id: crypto.randomUUID(), at: new Date().toISOString(),
      attacker: attacker.name, target: target.name, attackerKind: 'pc',
      hit: attack >= target.ac, damage, message: logLine,
    };
    await persistCombat({ ...combat, combatants }, attackEvent, turn.ref_id);
  }

  async function enemyAttack() {
    if (!combat || !adventure) return;
    const turn = currentTurn();
    if (!turn || turn.kind !== 'enemy' || turn.hp <= 0) return;
    const encounter = adventures.find((item) => item.id === combat.adventure_id) ?? adventure;
    const enemy = encounter.enemies.find((e) => e.name === turn.name) ?? encounter.enemies[0];
    const targets = combat.combatants.filter((c) => c.kind === 'pc' && c.hp > 0);
    if (targets.length === 0) return;
    const target = targets[Math.floor(Math.random() * targets.length)];
    const d20 = rollDie(20);
    const attack = d20 + (enemy?.attack_bonus ?? 2);
    const combatants = combat.combatants.map((combatant) => ({ ...combatant }));
    let logLine = '';
    let damage = 0;
    let nextHp = target.hp;
    if (attack >= target.ac) {
      const { total: rolledDamage, detail } = parseAndRoll(enemy?.damage_dice ?? '1d6');
      damage = Math.max(0, rolledDamage);
      nextHp = Math.max(0, target.hp - damage);
      const targetCopy = combatants.find((c) => c.ref_id === target.ref_id);
      if (targetCopy) targetCopy.hp = nextHp;
      logLine = `${turn.name} ataca a ${target.name}: saca ${d20} + bono = ${attack} contra defensa ${target.ac}. ¡Le pega! Daño ${damage} (${detail}). ${target.name} queda con ${nextHp} de vida.`;
    } else {
      logLine = `${turn.name} ataca a ${target.name}: saca ${d20} + bono = ${attack} contra defensa ${target.ac}. ¡No le pega!`;
    }
    const attackEvent: CombatAttackEvent = {
      type: 'jth.attack.v1', id: crypto.randomUUID(), at: new Date().toISOString(),
      attacker: turn.name, target: target.name, attackerKind: 'enemy',
      hit: attack >= target.ac, damage, message: logLine,
    };
    if (!await persistCombat({ ...combat, combatants }, attackEvent, turn.ref_id)) return;
    // The copied combatant and character sheet receive exactly the same damage.
    if (attack >= target.ac && schemaOk) {
      const { error } = await supabase.from('characters').update({ hp: nextHp })
        .eq('id', target.ref_id).eq('status', 'vivo').select('id').single();
      if (error) setResult('El golpe se guardó en el combate, pero la hoja no pudo actualizarse. Revisa la vida del personaje en Personajes.');
      onCharactersChange();
    }
  }

  async function deathSave(char: CharacterRow) {
    if (char.status !== 'vivo' || char.hp > 0) return;
    const d20 = rollDie(20);
    const saves = deathSaves[char.id] ?? { ok: 0, fail: 0 };
    let next = { ...saves };
    let msg = '';
    if (d20 === 20) {
      next = { ok: 3, fail: 0 };
      msg = `¡Un 20! ${char.name} se levanta con 1 punto de vida. ¡Está de vuelta!`;
      if (schemaOk) {
        const { error } = await supabase.from('characters').update({ hp: 1 }).eq('id', char.id).eq('status', 'vivo').eq('hp', 0).select('id').single();
        if (error) {
          setResult('La hoja cambió o no se pudo guardar la tirada. Revisa el estado del personaje antes de continuar.');
          onCharactersChange();
          return;
        }
        onCharactersChange();
      }
    } else if (d20 === 1) {
      next = { ...saves, fail: saves.fail + 2 };
      msg = `Un 1… mala suerte: ${char.name} suma dos fallos. Lleva ${next.fail} de 3 fallos.`;
    } else if (d20 >= 10) {
      next = { ...saves, ok: saves.ok + 1 };
      msg = `${char.name} saca ${d20}: un éxito. Lleva ${next.ok} de 3 éxitos.`;
    } else {
      next = { ...saves, fail: saves.fail + 1 };
      msg = `${char.name} saca ${d20}: un fallo. Lleva ${next.fail} de 3 fallos.`;
    }
    setDeathSaves({ ...deathSaves, [char.id]: next });
    setResult(msg);
    await saveRoll({
      world_id: world?.id ?? null,
      player_name: playerName,
      character_name: char.name,
      label: `Tirada para no morir de ${char.name}`,
      dice: '1d20',
      result: d20,
      detail: msg,
    });
    if (next.ok >= 3) {
      setResult(`${msg} ¡Se estabiliza! ${char.name} no muere, pero sigue inconsciente hasta que alguien lo cure.`);
    }
    if (next.fail >= 3) {
      setResult(`${char.name} ha caído. Registra su caída para que el mundo lo recuerde.`);
      setFallForm(char.id);
    }
  }

  async function registerFall(char: CharacterRow) {
    if (!schemaOk) return;
    const { error } = await supabase
      .from('characters')
      .update({ status: 'caido', hp: 0, death_note: `Cayó en ${adventure?.name ?? 'el mundo'}.` })
      .eq('id', char.id).eq('status', 'vivo')
      .select('id')
      .single();
    if (error) {
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
              <span className="character-avatar" aria-hidden="true">{activeChar.name.charAt(0)}</span>
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
          <div className="combatants">
            {combat.combatants.map((c, i) => (
              <div key={c.ref_id} className={`combatant ${i === combat.turn_index % combat.combatants.length ? 'active-turn' : ''} ${c.hp <= 0 ? 'down' : ''}`}>
                {c.kind === 'enemy' ? (
                  <MonsterPortrait name={c.name} className="combat-portrait" />
                ) : (
                  <span className="character-avatar" aria-hidden="true">{c.name.charAt(0)}</span>
                )}
                <div className="combatant-info">
                  <b>{c.name}</b>
                  <span>Vida {Math.max(0, c.hp)}/{c.max_hp} · Defensa {c.ac}</span>
                  <div className="hp-bar"><div style={{ width: `${(Math.max(0, c.hp) / Math.max(1, c.max_hp)) * 100}%` }} /></div>
                </div>
              </div>
            ))}
          </div>

          {turn?.kind === 'pc' && (
            <div>
              <h3>Tu turno, {turn.name}</h3>
              <div className="grid-actions">
                {combat.combatants.filter((c) => c.kind === 'enemy' && c.hp > 0).map((e) => (
                  <button key={e.ref_id} className="btn btn-action" disabled={combatPending} onClick={() => runCombatAction(() => pcAttack(e))}>
                    Atacar a {e.name}
                  </button>
                ))}
                <button className="btn" onClick={() => setResult(`${turn.name} se defiende: hasta su próximo turno, los ataques contra él tienen desventaja.`)}>
                  Defenderme
                </button>
                <button className="btn btn-primary" disabled={combatPending} onClick={() => runCombatAction(nextTurn)}>Siguiente turno →</button>
              </div>
            </div>
          )}
          {turn?.kind === 'enemy' && (
            <div>
              <h3>Turno del enemigo: {turn.name}</h3>
              <button className="btn btn-danger" disabled={combatPending} onClick={() => runCombatAction(enemyAttack)}>Que ataque</button>
              <button className="btn btn-primary" disabled={combatPending} onClick={() => runCombatAction(nextTurn)}>Siguiente turno →</button>
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
        const saves = deathSaves[c.id] ?? { ok: 0, fail: 0 };
        return (
          <div key={c.id} className="card danger-card">
            <h3>{c.name} está a 0 de vida</h3>
            <p>Éxitos: {saves.ok}/3 · Fallos: {saves.fail}/3. Saca 10 o más para un éxito. Un 20 te levanta con 1 de vida. Un 1 son dos fallos.</p>
            <button className="btn btn-danger" onClick={() => deathSave(c)}>Tirar para no morir</button>
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
