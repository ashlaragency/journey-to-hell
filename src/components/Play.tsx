// Sección Jugar: un solo recorrido lineal guiado.
// Escena arriba, pregunta "¿Qué haces?" con opciones grandes, resultado en
// palabras simples, botón Continuar. Combate con enemigos precargados.
import { useEffect, useMemo, useState } from 'react';
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

function skillMod(c: CharacterRow, skillName: string): number {
  const skill = SKILLS.find((s) => s.name === skillName);
  if (!skill) return 0;
  const ab = { FUE: c.str, DES: c.dex, CON: c.con, INT: c.int, WIS: c.wis, CHA: c.cha } as Record<string, number>;
  const base = abilityMod(ab[skill.ability] ?? 10);
  const prof = c.skills.includes(skillName) ? proficiencyBonus(c.level) : 0;
  return base + prof;
}

export default function Play({ world, characters, schemaOk, playerName, onCharactersChange }: PlayProps) {
  const [adventures, setAdventures] = useState<Adv[]>(ADVENTURES_SEED.map((a, i) => ({ ...a, id: `seed-${i}` })));
  const [adventureError, setAdventureError] = useState<string | null>(null);
  const [advId, setAdvId] = useState<string>(() => localStorage.getItem('jth_adv') ?? '');
  const [sceneIdx, setSceneIdx] = useState<number>(() => parseInt(localStorage.getItem('jth_scene') ?? '0', 10) || 0);
  const [charId, setCharId] = useState<string>(() => localStorage.getItem('jth_char') ?? '');
  const [result, setResult] = useState<string | null>(null);
  const [combat, setCombat] = useState<CombatRow | null>(null);
  const [deathSaves, setDeathSaves] = useState<Record<string, { ok: number; fail: number }>>({});
  const [fallForm, setFallForm] = useState<string | null>(null);
  const [legacyKind, setLegacyKind] = useState<'tumba' | 'cancion' | 'leyenda' | 'objeto' | 'lugar'>('leyenda');
  const [legacyTitle, setLegacyTitle] = useState('');
  const [legacyBody, setLegacyBody] = useState('');

  const living = useMemo(() => characters.filter((c) => c.status === 'vivo'), [characters]);
  const activeChar = useMemo(
    () => living.find((c) => c.id === charId) ?? living[0] ?? null,
    [living, charId],
  );
  const adventure = useMemo(
    () => adventures.find((a) => a.id === advId) ?? adventures[0] ?? null,
    [adventures, advId],
  );
  const worldId = world?.id;
  const scene = adventure?.scenes[Math.min(sceneIdx, adventure.scenes.length - 1)];

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

  // Cargar combate activo y suscribirse en vivo.
  useEffect(() => {
    if (!schemaOk || !worldId) return;
    const controller = new AbortController();
    (async () => {
      const { data } = await supabase
        .from('combat')
        .select('*')
        .eq('world_id', worldId)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .abortSignal(controller.signal)
        .maybeSingle();
      if (!controller.signal.aborted && data) setCombat(data as CombatRow);
    })();
    const ch = supabase
      .channel(`jth-combat-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combat' }, (payload) => {
        const row = (payload.new ?? payload.old) as CombatRow;
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') setCombat(row);
        if (payload.eventType === 'DELETE') setCombat(null);
      })
      .subscribe();
    return () => {
      controller.abort();
      void supabase.removeChannel(ch);
    };
  }, [schemaOk, worldId]);
  useEffect(() => {
    localStorage.setItem('jth_scene', String(sceneIdx));
  }, [sceneIdx]);
  useEffect(() => {
    if (activeChar) localStorage.setItem('jth_char', activeChar.id);
  }, [activeChar]);

  async function persistCombat(next: CombatRow | null) {
    setCombat(next);
    if (!schemaOk || !world || !next) return;
    await supabase
      .from('combat')
      .update({
        round: next.round,
        turn_index: next.turn_index,
        combatants: next.combatants,
        log: next.log,
        active: next.active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', next.id);
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
    if (!adventure || living.length === 0) return;
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
    setCombat(row);
    setResult(null);
    if (schemaOk && world) {
      await supabase.from('combat').insert({
        id: row.id,
        world_id: world.id,
        adventure_id: row.adventure_id,
        active: true,
        round: 1,
        turn_index: 0,
        combatants,
        log: row.log,
      });
    }
  }

  async function endCombat(msg: string) {
    if (!combat) return;
    const next = { ...combat, active: false, log: [...combat.log, msg] };
    if (schemaOk) {
      await supabase.from('combat').update({ active: false, log: next.log }).eq('id', combat.id);
    }
    setCombat(next);
    setResult(msg);
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
      await endCombat('Todos los héroes cayeron. El mundo sigue… y recordará esta derrota.');
      return;
    }
    if (!enemiesAlive) {
      await endCombat('¡Victoria! Todos los enemigos cayeron. La aventura continúa.');
      return;
    }
    let idx = (combat.turn_index + 1) % combat.combatants.length;
    let guard = 0;
    while (combat.combatants[idx].hp <= 0 && guard < combat.combatants.length) {
      idx = (idx + 1) % combat.combatants.length;
      guard++;
    }
    const round = idx <= combat.turn_index ? combat.round + 1 : combat.round;
    await persistCombat({ ...combat, turn_index: idx, round });
  }

  async function pcAttack(target: Combatant) {
    if (!combat || !activeChar) return;
    const turn = currentTurn();
    if (!turn || turn.kind !== 'pc') return;
    const weapon = WEAPONS.find((w) => w.name === activeChar.weapon) ?? WEAPONS[0];
    const mod = abilityMod(activeChar.str);
    const d20 = rollDie(20);
    const attack = d20 + proficiencyBonus(activeChar.level) + mod;
    let logLine = '';
    let combatants = [...combat.combatants];
    if (attack >= target.ac) {
      const { total: dmg, detail } = parseAndRoll(`${weapon.dice}${mod >= 0 ? '+' : ''}${mod}`);
      const t = combatants.find((c) => c.ref_id === target.ref_id);
      if (t) t.hp = Math.max(0, t.hp - dmg);
      logLine = `${activeChar.name} ataca a ${target.name} con ${weapon.name}: saca ${d20} + bono = ${attack} contra defensa ${target.ac}. ¡Le pega! Daño ${dmg} (${detail}).`;
      await saveRoll({
        world_id: world?.id ?? null,
        player_name: playerName,
        character_name: activeChar.name,
        label: `Ataque de ${activeChar.name} a ${target.name}`,
        dice: `1d20+${proficiencyBonus(activeChar.level) + mod}`,
        result: attack,
        detail: `Dado ${d20} · defensa enemiga ${target.ac}`,
      });
    } else {
      logLine = `${activeChar.name} ataca a ${target.name}: saca ${d20} + bono = ${attack} contra defensa ${target.ac}. ¡No le pega!`;
    }
    await persistCombat({ ...combat, combatants, log: [...combat.log, logLine] });
  }

  async function enemyAttack() {
    if (!combat || !adventure) return;
    const turn = currentTurn();
    if (!turn || turn.kind !== 'enemy') return;
    const enemy = adventure.enemies.find((e) => e.name === turn.name) ?? adventure.enemies[0];
    const targets = combat.combatants.filter((c) => c.kind === 'pc' && c.hp > 0);
    if (targets.length === 0) return;
    const target = targets[Math.floor(Math.random() * targets.length)];
    const d20 = rollDie(20);
    const attack = d20 + (enemy?.attack_bonus ?? 2);
    let combatants = [...combat.combatants];
    let logLine = '';
    if (attack >= target.ac) {
      const { total: dmg, detail } = parseAndRoll(enemy?.damage_dice ?? '1d6');
      const t = combatants.find((c) => c.ref_id === target.ref_id);
      if (t) t.hp = Math.max(0, t.hp - dmg);
      logLine = `${turn.name} ataca a ${target.name}: saca ${d20} + bono = ${attack} contra defensa ${target.ac}. ¡Le pega! Daño ${dmg} (${detail}). ${target.name} queda con ${Math.max(0, target.hp - dmg)} de vida.`;
      // Reflejar el daño en la hoja del personaje
      const pc = characters.find((c) => c.id === target.ref_id);
      if (pc && schemaOk) {
        await supabase.from('characters').update({ hp: Math.max(0, target.hp - dmg) }).eq('id', pc.id);
        onCharactersChange();
      }
    } else {
      logLine = `${turn.name} ataca a ${target.name}: saca ${d20} + bono = ${attack} contra defensa ${target.ac}. ¡No le pega!`;
    }
    await persistCombat({ ...combat, combatants, log: [...combat.log, logLine] });
  }

  async function deathSave(char: CharacterRow) {
    const d20 = rollDie(20);
    const saves = deathSaves[char.id] ?? { ok: 0, fail: 0 };
    let next = { ...saves };
    let msg = '';
    if (d20 === 20) {
      next = { ok: 3, fail: 0 };
      msg = `¡Un 20! ${char.name} se levanta con 1 punto de vida. ¡Está de vuelta!`;
      if (schemaOk) {
        await supabase.from('characters').update({ hp: 1 }).eq('id', char.id);
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
    await supabase
      .from('characters')
      .update({ status: 'caido', hp: 0, death_note: `Cayó en ${adventure?.name ?? 'el mundo'}.` })
      .eq('id', char.id);
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
      place: adventure?.scenes[sceneIdx]?.place ?? null,
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
    <div>
      {!schemaOk && (
        <div className="banner-warning">
          ⚠️ Las tablas del juego aún no están listas en Supabase. Aplica el archivo <b>schema.sql</b> en el editor SQL del panel de Supabase (proyecto dnd-mundo-vivo) para que el juego se guarde y se sincronice. Mientras tanto puedes explorar las aventuras.
        </div>
      )}

      {adventureError && adventureError === worldId && (
        <p className="banner-warning" role="status">No se pudieron cargar las aventuras del mundo. Puedes explorar las aventuras incluidas en el juego.</p>
      )}

      {/* Selector de aventura y personaje */}
      <div className="card">
        <h3>🗺️ ¿Dónde juegas?</h3>
        <div className="row">
          <label>
            Aventura
            <select value={adventure?.id ?? ''} onChange={(e) => {
              setAdvId(e.target.value);
              localStorage.setItem('jth_adv', e.target.value);
              setSceneIdx(0);
              setResult(null);
            }}>
              {adventures.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.durationLabel}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tu personaje
            <select value={activeChar?.id ?? ''} onChange={(e) => setCharId(e.target.value)}>
              {living.length === 0 && <option value="">Sin personaje vivo</option>}
              {living.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.species} {c.class_name} (vida {c.hp}/{c.max_hp})
                </option>
              ))}
            </select>
          </label>
        </div>
        {living.length === 0 && (
          <p>Primero crea un personaje en la pestaña <b>Personajes</b>. Solo escribes el nombre, lo demás se elige tocando.</p>
        )}
      </div>

      {/* Escena actual */}
      {adventure && scene && (
        <div className="card scene-card">
          <div className="world-tag">🌍 {world?.name ?? 'Journey to Hell'} · {adventure.name}</div>
          <h2>📍 Estás aquí: {scene.place}</h2>
          <p className="narration">{scene.narration}</p>
          <p className="scene-progress">
            Escena {Math.min(sceneIdx + 1, adventure.scenes.length)} de {adventure.scenes.length}
          </p>
          {activeChar && (
            <p className="char-status">
              <b>{activeChar.name}</b> · {activeChar.species} {activeChar.class_name} · Vida {activeChar.hp}/{activeChar.max_hp} · Defensa {activeChar.ac}
            </p>
          )}
        </div>
      )}

      {/* Resultado de la última acción */}
      {result && (
        <div className="card result-card">
          <p>{result}</p>
          {!combat?.active && (
            <button className="btn btn-primary" onClick={() => { setResult(null); }}>
              Entendido
            </button>
          )}
        </div>
      )}

      {/* ¿Qué haces? */}
      {!combat?.active && activeChar && (
        <div className="card">
          <h2>❓ ¿Qué haces?</h2>
          <p className="hint">Toca una opción. El juego tira el dado por ti y te explica qué pasa.</p>
          <div className="grid-actions">
            <button className="btn btn-action" onClick={() => rollSkill('Percepción', 'Mirar')}>
              👀 Mirar a mi alrededor
            </button>
            <button className="btn btn-action" onClick={() => rollSkill('Persuasión', 'Hablar')}>
              💬 Hablar con alguien
            </button>
            <button className="btn btn-action" onClick={() => rollSkill('Sigilo', 'Moverse sin ruido')}>
              🤫 Moverme sin ruido
            </button>
            <button className="btn btn-action" onClick={() => rollSkill('Investigación', 'Buscar pistas')}>
              🔍 Buscar pistas
            </button>
            <button
              className="btn btn-action"
              onClick={() => {
                setSceneIdx((i) => Math.min(i + 1, (adventure?.scenes.length ?? 1) - 1));
                setResult('Avanzas al siguiente lugar. ¿Qué ves ahora?');
              }}
            >
              🚶 Seguir adelante
            </button>
            <button className="btn btn-danger" onClick={startCombat}>
              ⚔️ ¡A pelear!
            </button>
          </div>
          <p className="hint">Para mirar, hablar o moverte sin ruido necesitas sacar 12 o más con el dado de 20 caras más tu bono.</p>
        </div>
      )}

      {/* Combate */}
      {combat?.active && (
        <div className="card combat-card">
          <h2>⚔️ ¡Pelea en {adventure?.name}!</h2>
          <p className="hint">Ronda {combat.round} · Turno de: <b>{turn?.name ?? '—'}</b></p>
          <div className="combatants">
            {combat.combatants.map((c, i) => (
              <div key={c.ref_id} className={`combatant ${i === combat.turn_index % combat.combatants.length ? 'active-turn' : ''} ${c.hp <= 0 ? 'down' : ''}`}>
                <b>{c.kind === 'pc' ? '🧑' : '👹'} {c.name}</b>
                <span>Vida {Math.max(0, c.hp)}/{c.max_hp} · Defensa {c.ac}</span>
                <div className="hp-bar"><div style={{ width: `${(Math.max(0, c.hp) / c.max_hp) * 100}%` }} /></div>
              </div>
            ))}
          </div>

          {turn?.kind === 'pc' && (
            <div>
              <h3>Tu turno, {turn.name}</h3>
              <div className="grid-actions">
                {combat.combatants.filter((c) => c.kind === 'enemy' && c.hp > 0).map((e) => (
                  <button key={e.ref_id} className="btn btn-action" onClick={() => pcAttack(e)}>
                    ⚔️ Atacar a {e.name}
                  </button>
                ))}
                <button className="btn" onClick={() => setResult(`${turn.name} se defiende: hasta su próximo turno, los ataques contra él tienen desventaja.`)}>
                  🛡️ Defenderme
                </button>
                <button className="btn btn-primary" onClick={nextTurn}>Siguiente turno →</button>
              </div>
            </div>
          )}
          {turn?.kind === 'enemy' && (
            <div>
              <h3>Turno del enemigo: {turn.name}</h3>
              <button className="btn btn-danger" onClick={enemyAttack}>👹 Que ataque</button>
              <button className="btn btn-primary" onClick={nextTurn}>Siguiente turno →</button>
            </div>
          )}

          <div className="combat-log">
            {combat.log.slice(-6).map((l, i) => (
              <p key={i}>• {l}</p>
            ))}
          </div>
          <button className="btn" onClick={() => endCombat('La pelea termina. El grupo respira, se cura y sigue su camino.')}>
            Terminar la pelea
          </button>
        </div>
      )}

      {/* Personajes a 0 de vida: tirada para no morir */}
      {dying.map((c) => {
        const saves = deathSaves[c.id] ?? { ok: 0, fail: 0 };
        return (
          <div key={c.id} className="card danger-card">
            <h3>🆘 {c.name} está a 0 de vida</h3>
            <p>Éxitos: {saves.ok}/3 · Fallos: {saves.fail}/3. Saca 10 o más para un éxito. Un 20 te levanta con 1 de vida. Un 1 son dos fallos.</p>
            <button className="btn btn-danger" onClick={() => deathSave(c)}>🎲 Tirar para no morir</button>
          </div>
        );
      })}

      {/* Registrar caída y legado */}
      {fallen.filter((c) => fallForm === c.id).map((c) => (
        <div key={c.id} className="card legacy-card">
          <h3>🪦 {c.name} ha caído</h3>
          <p>Su hoja queda sellada para siempre y su nombre no podrá volver a usarse. ¿Qué queda de él en el mundo?</p>
          <div className="chips">
            {(['tumba', 'cancion', 'leyenda', 'objeto', 'lugar'] as const).map((k) => (
              <button key={k} className={`chip ${legacyKind === k ? 'chip-selected' : ''}`} onClick={() => setLegacyKind(k)}>
                {k === 'tumba' ? '🪦 Tumba' : k === 'cancion' ? '🎵 Canción' : k === 'leyenda' ? '📜 Leyenda' : k === 'objeto' ? '🗡️ Objeto' : '📍 Lugar'}
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
            🪦 Registrar la caída de {c.name} (no hay vuelta atrás)
          </button>
        </div>
      ))}
    </div>
  );
}
