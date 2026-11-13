import { useEffect, useMemo, useRef, useState } from 'react';
import { useActiveCombat, saveCombatMove } from './useActiveCombat';
import { ABSENCE_GRACE_MS, absentCombatants, playerKey, withdraw } from '../lib/rearguard';
import type { CharacterRow } from '../lib/supabase';

interface UseCombatAbsenceGuardProps {
  worldId: string | null | undefined;
  schemaOk: boolean;
  characters: CharacterRow[];
  presentNames: string[];
  presenceConnected: boolean;
}

/** Keep absent players' heroes safe even when nobody has Aventura open. */
export function useCombatAbsenceGuard({ worldId, schemaOk, characters, presentNames, presenceConnected }: UseCombatAbsenceGuardProps) {
  const [combat, setCombat] = useActiveCombat(worldId, schemaOk);
  const absentSince = useRef(new Map<string, number>());
  const [absenceSnapshot, setAbsenceSnapshot] = useState<Map<string, number>>(() => new Map());
  const [clock, setClock] = useState(() => Date.now());
  const ownerById = useMemo(() => new Map(characters.map((character) => [character.id, character.owner_name])), [characters]);
  const ownerKeys = useMemo(() => [...new Set(characters.map((character) => playerKey(character.owner_name)).filter(Boolean))], [characters]);
  const presentKeys = useMemo(() => new Set(presentNames.map(playerKey).filter(Boolean)), [presentNames]);
  const presentSignature = useMemo(() => [...presentKeys].sort().join('\u0000'), [presentKeys]);

  useEffect(() => {
    if (!presenceConnected) {
      absentSince.current.clear();
      return;
    }
    const update = () => {
      const now = Date.now();
      const owners = new Set(ownerKeys);
      for (const owner of absentSince.current.keys()) if (!owners.has(owner)) absentSince.current.delete(owner);
      for (const owner of ownerKeys) {
        if (presentKeys.has(owner)) absentSince.current.delete(owner);
        else if (!absentSince.current.has(owner)) absentSince.current.set(owner, now);
      }
      setAbsenceSnapshot(new Map(absentSince.current));
      setClock(now);
    };
    const initial = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 1000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [presenceConnected, ownerKeys, presentKeys, presentSignature]);

  useEffect(() => {
    if (!combat?.active || !presenceConnected) return;
    let writing = false;
    const check = async () => {
      if (writing) return;
      const now = Date.now();
      const overdue = absentCombatants(combat.combatants, ownerById, presentNames)
        .filter(({ owner }) => now - (absentSince.current.get(owner) ?? now) >= ABSENCE_GRACE_MS)
        .map(({ refId }) => refId);
      if (!overdue.length) return;
      let next = combat;
      for (const refId of overdue) next = withdraw(next, refId, true) ?? next;
      if (next === combat) return;
      writing = true;
      try {
        const saved = await saveCombatMove(combat, next);
        if (saved) setCombat(saved);
      } catch {
        // A later interval retries against the latest active combat row.
      } finally {
        writing = false;
      }
    };
    void check();
    const timer = window.setInterval(() => { void check(); }, 5000);
    return () => window.clearInterval(timer);
  }, [combat, ownerById, presentNames, presenceConnected, setCombat]);

  const overdueCharacterIds = useMemo(() => {
    if (!presenceConnected) return [];
    return characters.flatMap((character) => {
      const owner = playerKey(character.owner_name);
      const absentAt = absenceSnapshot.get(owner);
      return owner && !presentKeys.has(owner) && absentAt !== undefined && clock - absentAt >= ABSENCE_GRACE_MS
        ? [character.id]
        : [];
    });
  }, [absenceSnapshot, characters, clock, presentKeys, presenceConnected]);

  return { overdueCharacterIds };
}
