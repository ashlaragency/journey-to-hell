import { useRef, useState } from 'react';
import { playSound } from '../lib/audio';
import { publishLocalCombatEffect, type CombatAttackEvent } from '../lib/combatEffects';
import { ADVENTURES_SEED } from '../lib/compendium.ts';
import { abilityMod, proficiencyBonus, rollDie, WEAPONS } from '../lib/data.ts';
import { minimumHitDamage } from '../lib/combatRules.ts';
import { afterAttack, battleOutcome, enemyTargets, nextTurn as advanceTurn, type BattleOutcome } from '../lib/rearguard.ts';
import { parseAndRoll, saveRoll, supabase, type CharacterRow, type CombatRow, type Combatant } from '../lib/supabase';

interface CombatAdventure {
  id: string;
  name: string;
  enemies: { name: string; hp: number; ac: number; attack_bonus: number; damage_dice: string }[];
}

interface UseCombatActionsProps {
  combat: CombatRow | null;
  setCombat: (combat: CombatRow | null) => void;
  worldId: string | null;
  schemaOk: boolean;
  playerName: string;
  characters: CharacterRow[];
  onCharactersChange: () => void;
  setResult: (message: string | null) => void;
  adventures?: CombatAdventure[];
  adventure?: CombatAdventure | null;
}

function outcomeMessage(outcome: BattleOutcome): string {
  if (outcome === 'victory') return '¡Victoria! Todos los enemigos cayeron. La aventura continúa.';
  if (outcome === 'retreat') return 'Nadie queda en pie en el frente. Quienes esperaban en la retaguardia recogen a los suyos y la compañía se repliega.';
  return 'Todos los héroes cayeron. El mundo sigue… y recordará esta derrota.';
}

function encounterName(combat: CombatRow): string | null {
  for (const line of combat.log) {
    const name = line.match(/¡Empieza la pelea en (.+)!/)?.[1]
      ?? line.match(/abre el encuentro de (.+)\.$/)?.[1];
    if (name) return name;
  }
  return null;
}

function fallbackEnemy(combat: CombatRow, adventures: CombatAdventure[], adventure?: CombatAdventure | null) {
  const name = encounterName(combat);
  const source = (combat.adventure_id ? adventures.find((item) => item.id === combat.adventure_id) : null)
    ?? (adventure?.name === name ? adventure : null)
    ?? adventures.find((item) => item.name === name)
    ?? ADVENTURES_SEED.find((item) => item.name === name);
  return source?.enemies;
}

export function useCombatActions({
  combat,
  setCombat,
  worldId,
  schemaOk,
  playerName,
  characters,
  onCharactersChange,
  setResult,
  adventures = [],
  adventure = null,
}: UseCombatActionsProps) {
  const [pending, setPending] = useState(false);
  const inProgress = useRef(false);

  async function runAction(action: () => Promise<void>) {
    if (inProgress.current) return;
    inProgress.current = true;
    setPending(true);
    try {
      await action();
    } catch {
      setResult('No se pudo guardar la acción. Revisa tu conexión antes de volver a intentarlo.');
      playSound('failure');
    } finally {
      inProgress.current = false;
      setPending(false);
    }
  }

  async function persistCombat(next: CombatRow, attackEvent?: CombatAttackEvent, attackerRefId?: string, silent = false, completionMessage?: string): Promise<boolean> {
    if (!schemaOk || !worldId) {
      if (!silent) setResult('Necesitas conexión con el mundo para guardar el combate.');
      return false;
    }
    if (attackEvent && !next.combatants.some((item) => item.ref_id === attackerRefId)) {
      setResult('El atacante ya no está en este combate. Revisa la mesa antes de continuar.');
      return false;
    }
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
        log: committedAttack
          ? [...next.log, committedAttack.message, ...(completionMessage ? [completionMessage] : [])]
          : next.log,
        active: next.active,
        updated_at: committedAt,
      })
      .eq('id', next.id)
      .eq('world_id', worldId)
      .eq('active', true)
      .eq('updated_at', combat?.updated_at ?? next.updated_at)
      .select('*')
      .maybeSingle();
    if (!error && !data) {
      const { data: current } = await supabase.from('combat').select('*').eq('id', next.id).eq('world_id', worldId).maybeSingle();
      if (current) setCombat(current as CombatRow);
      if (!silent) {
        setResult('La mesa cambió mientras actuabas. Revisa el turno actualizado y vuelve a elegir tu acción.');
        playSound('failure');
      }
      return false;
    }
    if (error || !data) {
      if (!silent) {
        setResult('No se pudo guardar la acción del combate. Inténtalo de nuevo.');
        playSound('failure');
      }
      return false;
    }
    setCombat(data as CombatRow);
    if (committedAttack) publishLocalCombatEffect(committedAttack, worldId);
    return true;
  }

  async function publishCombatEnd(message: string, sound: 'success' | 'failure' | 'select') {
    setResult(message);
    playSound(sound);
    if (schemaOk && worldId) {
      await supabase.from('journal_entries').insert({ world_id: worldId, title: 'Batalla', body: message, kind: 'cronica' });
    }
  }

  async function endCombat(message: string, sound: 'success' | 'failure' | 'select' = 'select') {
    if (!combat) return;
    if (!await persistCombat({ ...combat, active: false, log: [...combat.log, message] })) return;
    await publishCombatEnd(message, sound);
  }

  function currentTurn(): Combatant | null {
    if (!combat?.combatants.length) return null;
    return combat.combatants[combat.turn_index % combat.combatants.length];
  }

  async function nextTurn() {
    if (!combat) return;
    const outcome = battleOutcome(combat.combatants);
    if (outcome) {
      await endCombat(outcomeMessage(outcome), outcome === 'victory' ? 'success' : 'failure');
      return;
    }
    const turn = advanceTurn(combat.combatants, combat.turn_index, combat.round);
    if (turn && await persistCombat({ ...combat, ...turn })) playSound('select');
  }

  async function finishAttack(base: CombatRow, attackEvent: CombatAttackEvent, attackerRefId: string) {
    const transition = afterAttack(base);
    const completion = transition.outcome ? outcomeMessage(transition.outcome) : undefined;
    if (!await persistCombat(transition.combat, attackEvent, attackerRefId, false, completion)) return;
    if (transition.outcome) await publishCombatEnd(completion!, transition.outcome === 'victory' ? 'success' : 'failure');
  }

  async function pcAttack(targetRefId: string, expectedAttackerRefId?: string) {
    if (!combat) return;
    const turn = currentTurn();
    if (!turn || turn.kind !== 'pc' || turn.hp <= 0 || turn.away || (expectedAttackerRefId && expectedAttackerRefId !== turn.ref_id)) return;
    const target = combat.combatants.find((item) => item.ref_id === targetRefId && item.kind === 'enemy' && item.hp > 0);
    const attacker = characters.find((character) => character.id === turn.ref_id && character.status === 'vivo');
    if (!target || !attacker) return;
    const weapon = WEAPONS.find((item) => item.name === attacker.weapon) ?? WEAPONS[0];
    const mod = abilityMod(attacker.str);
    const d20 = rollDie(20);
    const attack = d20 + proficiencyBonus(attacker.level) + mod;
    const hit = attack >= target.ac;
    let damage = 0;
    const combatants = combat.combatants.map((item) => ({ ...item }));
    let logLine: string;
    if (hit) {
      const { total: rolledDamage, detail } = parseAndRoll(`${weapon.dice}${mod >= 0 ? '+' : ''}${mod}`);
      damage = minimumHitDamage(rolledDamage);
      const victim = combatants.find((item) => item.ref_id === target.ref_id);
      if (victim) victim.hp = Math.max(0, victim.hp - damage);
      logLine = `${attacker.name} ataca a ${target.name} con ${weapon.name}: saca ${d20} + bono = ${attack} contra defensa ${target.ac}. ¡Le pega! Daño ${damage} (${detail}).`;
      await saveRoll({ world_id: worldId, player_name: playerName, character_name: attacker.name,
        label: `Ataque de ${attacker.name} a ${target.name}`, dice: `1d20+${proficiencyBonus(attacker.level) + mod}`,
        result: attack, detail: `Dado ${d20} · defensa enemiga ${target.ac}` });
    } else {
      logLine = `${attacker.name} ataca a ${target.name}: saca ${d20} + bono = ${attack} contra defensa ${target.ac}. ¡No le pega!`;
    }
    const event: CombatAttackEvent = { type: 'jth.attack.v1', id: crypto.randomUUID(), at: new Date().toISOString(), attacker: attacker.name,
      target: target.name, attackerKind: 'pc', hit, damage, message: logLine };
    await finishAttack({ ...combat, combatants }, event, turn.ref_id);
  }

  async function enemyAttack(expectedEnemyRefId?: string) {
    if (!combat) return;
    const turn = currentTurn();
    if (!turn || turn.kind !== 'enemy' || turn.hp <= 0 || (expectedEnemyRefId && expectedEnemyRefId !== turn.ref_id)) return;
    const targets = enemyTargets(combat.combatants);
    if (!targets.length) {
      setResult('No hay nadie al frente: quienes quedan están en la retaguardia. Puedes pasar el turno.');
      return;
    }
    const adventureEnemies = fallbackEnemy(combat, adventures, adventure);
    let enemy = combat.adventure_id && worldId
      ? (await supabase.from('enemies').select('name,hp,ac,attack_bonus,damage_dice').eq('adventure_id', combat.adventure_id).eq('name', turn.name).maybeSingle()).data
      : null;
    enemy ??= adventureEnemies?.find((item) => item.name === turn.name) ?? adventureEnemies?.[0] ?? null;
    const target = targets[Math.floor(Math.random() * targets.length)];
    const d20 = rollDie(20);
    const attack = d20 + (enemy?.attack_bonus ?? 2);
    const hit = attack >= target.ac;
    const combatants = combat.combatants.map((item) => ({ ...item }));
    let damage = 0;
    let nextHp = target.hp;
    let logLine: string;
    if (hit) {
      const { total: rolledDamage, detail } = parseAndRoll(enemy?.damage_dice ?? '1d6');
      damage = minimumHitDamage(rolledDamage);
      nextHp = Math.max(0, target.hp - damage);
      const victim = combatants.find((item) => item.ref_id === target.ref_id);
      if (victim) victim.hp = nextHp;
      logLine = `${turn.name} ataca a ${target.name}: saca ${d20} + bono = ${attack} contra defensa ${target.ac}. ¡Le pega! Daño ${damage} (${detail}). ${target.name} queda con ${nextHp} de vida.`;
    } else {
      logLine = `${turn.name} ataca a ${target.name}: saca ${d20} + bono = ${attack} contra defensa ${target.ac}. ¡No le pega!`;
    }
    const event: CombatAttackEvent = { type: 'jth.attack.v1', id: crypto.randomUUID(), at: new Date().toISOString(), attacker: turn.name,
      target: target.name, attackerKind: 'enemy', hit, damage, message: logLine };
    const transition = afterAttack({ ...combat, combatants });
    const completion = transition.outcome ? outcomeMessage(transition.outcome) : undefined;
    if (!await persistCombat(transition.combat, event, turn.ref_id, false, completion)) return;
    if (hit && schemaOk) {
      const { error } = await supabase.from('characters').update({ hp: nextHp }).eq('id', target.ref_id).eq('status', 'vivo').select('id').single();
      if (error) setResult('El golpe se guardó en el combate, pero la hoja no pudo actualizarse. Revisa la vida del personaje en Personajes.');
      onCharactersChange();
    }
    if (transition.outcome) await publishCombatEnd(completion!, transition.outcome === 'victory' ? 'success' : 'failure');
  }

  return { pending, runAction, persistCombat, endCombat, currentTurn, nextTurn, pcAttack, enemyAttack };
}
