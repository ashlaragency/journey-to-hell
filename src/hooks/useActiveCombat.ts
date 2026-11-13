import { useCallback, useEffect, useState } from 'react';
import { supabase, type CombatRow } from '../lib/supabase';

/** El combate abierto en la mesa, actualizado en vivo. */
export function useActiveCombat(worldId: string | null | undefined, enabled: boolean): [CombatRow | null, (row: CombatRow | null) => void] {
  const [state, setState] = useState<{ worldId: string; combat: CombatRow | null } | null>(null);
  useEffect(() => {
    if (!enabled || !worldId) return;
    const controller = new AbortController();
    let revision = 0;
    const set = (combat: CombatRow | null) => setState({ worldId, combat: combat?.active ? combat : null });
    async function refresh() {
      const observed = revision;
      const { data, error } = await supabase.from('combat').select('*').eq('world_id', worldId).eq('active', true)
        .order('created_at', { ascending: false }).limit(1).abortSignal(controller.signal).maybeSingle();
      if (!controller.signal.aborted && !error && observed === revision) set(data as CombatRow | null);
    }
    void refresh();
    const channel = supabase.channel(`jth-board-combat-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combat', filter: `world_id=eq.${worldId}` }, (payload) => {
        revision++;
        if (payload.eventType === 'DELETE') void refresh();
        else set(payload.new as CombatRow);
      })
      .subscribe((status) => { if (status === 'SUBSCRIBED') void refresh(); });
    const onVisible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      controller.abort();
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [worldId, enabled]);
  const combat = enabled && state && state.worldId === worldId ? state.combat : null;
  const updateCombat = useCallback((row: CombatRow | null) => {
    if (worldId) setState({ worldId, combat: row?.active ? row : null });
  }, [worldId]);
  return [combat, updateCombat];
}

/**
 * Guarda un movimiento de ficha. Solo se escribe si nadie cambió el combate
 * mientras tanto; si no, devuelve null y la mesa se queda con el estado nuevo.
 */
export async function saveCombatMove(previous: CombatRow, next: CombatRow): Promise<CombatRow | null> {
  const before = Date.parse(previous.updated_at) || 0;
  const { data, error } = await supabase.from('combat')
    .update({
      combatants: next.combatants,
      round: next.round,
      turn_index: next.turn_index,
      log: next.log,
      active: next.active,
      updated_at: new Date(Math.max(Date.now(), before + 1)).toISOString(),
    })
    .eq('id', previous.id).eq('world_id', previous.world_id).eq('active', true).eq('updated_at', previous.updated_at).select('*').maybeSingle();
  return error || !data ? null : data as CombatRow;
}
