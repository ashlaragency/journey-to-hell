import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { playSound } from '../lib/audio';
import { COMBAT_EFFECT_DURATION, COMBAT_EFFECT_EVENT, isFreshCombatEffect, parseCombatAttackEvent, type CombatAttackEvent } from '../lib/combatEffects';

export function useCombatEffects(worldId: string | null | undefined, enabled: boolean) {
  const [view, setView] = useState<{ worldId: string; event: CombatAttackEvent } | null>(null);

  useEffect(() => {
    if (!enabled || !worldId) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current: CombatAttackEvent | null = null;
    const queue: CombatAttackEvent[] = [];
    const seen = new Set<string>();

    function present() {
      if (disposed || document.visibilityState !== 'visible') return;
      let event = queue.shift();
      while (event && !isFreshCombatEffect(event)) event = queue.shift();
      current = event ?? null;
      setView(event ? { worldId: worldId!, event } : null);
      if (!event) return;
      playSound(event.hit ? 'hit' : 'miss');
      timer = setTimeout(present, COMBAT_EFFECT_DURATION);
    }

    function accept(value: unknown) {
      const event = parseCombatAttackEvent(value);
      if (disposed || !event || seen.has(event.id) || !isFreshCombatEffect(event)) return;
      seen.add(event.id);
      if (seen.size > 100) seen.delete(seen.values().next().value!);
      // Hidden tabs discard effects instead of replaying them on return.
      if (document.visibilityState !== 'visible') return;
      queue.push(event);
      if (current) {
        while (queue.length > 2) queue.shift();
      } else {
        present();
      }
    }

    function onLocal(event: Event) {
      const detail: unknown = (event as CustomEvent).detail;
      if (!detail || typeof detail !== 'object' || !('worldId' in detail) || !('event' in detail)) return;
      if (detail.worldId === worldId) accept(detail.event);
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') return;
      clearTimeout(timer);
      current = null;
      queue.length = 0;
      setView(null);
    }

    window.addEventListener(COMBAT_EFFECT_EVENT, onLocal);
    document.addEventListener('visibilitychange', onVisibility);
    const channel = supabase.channel(`jth-attack-effects-${worldId}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'combat', filter: `world_id=eq.${worldId}` }, (payload) => {
        const row = payload.new;
        if (row.world_id !== worldId || !Array.isArray(row.combatants) || typeof row.updated_at !== 'string') return;
        const updatedAt = Date.parse(row.updated_at);
        for (const fighter of row.combatants) {
          if (!fighter || typeof fighter !== 'object') continue;
          const event = parseCombatAttackEvent(fighter.last_attack);
          // The metadata travels with the damage. Later turns keep it, but cannot replay it.
          if (event && event.attacker === fighter.name && event.attackerKind === fighter.kind
            && Date.parse(event.at) === updatedAt) { accept(event); break; }
        }
      }).subscribe();
    return () => {
      disposed = true;
      clearTimeout(timer);
      queue.length = 0;
      window.removeEventListener(COMBAT_EFFECT_EVENT, onLocal);
      document.removeEventListener('visibilitychange', onVisibility);
      void supabase.removeChannel(channel);
    };
  }, [worldId, enabled]);

  return enabled && view && view.worldId === worldId ? view.event : null;
}
