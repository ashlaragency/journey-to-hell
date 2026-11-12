import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { newerCue, parseSceneCue, SCENE_EVENT_TITLE, type SessionCue } from '../lib/session';

interface SessionState {
  worldId: string | null;
  cue: SessionCue | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
}

export function useSession(worldId: string | null | undefined, enabled: boolean) {
  const [state, setState] = useState<SessionState>({ worldId: null, cue: null, loading: false, error: null, connected: false });
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const refresh = useCallback(async () => { await refreshRef.current(); }, []);

  useEffect(() => {
    if (!enabled || !worldId) return;
    let disposed = false;
    let request = 0;
    let latest: SessionCue | null = null;
    const controller = new AbortController();
    const update = (patch: Partial<SessionState>) => {
      if (!disposed) setState((previous) => ({ ...previous, worldId, ...patch }));
    };
    update({ cue: null, loading: true, error: null, connected: false });
    const accept = (candidate: SessionCue) => {
      if (candidate.world_id !== worldId) return;
      latest = newerCue(latest, candidate);
      update({ cue: latest });
    };
    const fetchCue = async () => {
      const currentRequest = ++request;
      try {
        const { data, error } = await supabase.from('world_events')
          .select('*').eq('world_id', worldId).eq('kind', 'evento').eq('title', SCENE_EVENT_TITLE)
          .order('created_at', { ascending: false }).order('id', { ascending: false })
          .limit(20).abortSignal(controller.signal);
        if (disposed || currentRequest !== request) return;
        if (error) throw error;
        const parsed = (data ?? []).map(parseSceneCue).find((cue) => cue !== null);
        if (parsed) accept(parsed);
        update({ error: null, loading: false });
      } catch {
        if (!disposed && currentRequest === request) update({ loading: false, error: 'No se pudo sincronizar la escena. Inténtalo de nuevo.' });
      }
    };
    refreshRef.current = fetchCue;
    void fetchCue();
    const channel = supabase.channel(`jth-session-${worldId}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'world_events', filter: `world_id=eq.${worldId}` }, (event) => {
        const cue = parseSceneCue(event.new);
        if (cue) accept(cue);
      })
      .subscribe((status) => {
        if (disposed) return;
        if (status === 'SUBSCRIBED') {
          update({ connected: true });
          void fetchCue();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          update({ connected: false });
        }
      });
    const onVisible = () => { if (document.visibilityState === 'visible') void fetchCue(); };
    const onOnline = () => { void fetchCue(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      disposed = true;
      controller.abort();
      refreshRef.current = async () => {};
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      void supabase.removeChannel(channel);
    };
  }, [worldId, enabled]);

  const active = enabled && !!worldId && state.worldId === worldId;
  return {
    cue: active ? state.cue : null,
    loading: enabled && !!worldId && (!active || state.loading),
    error: active ? state.error : null,
    connected: active && state.connected,
    refresh,
  };
}
