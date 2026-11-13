import { useEffect, useState } from 'react';
import { supabase, type WorldEventRow } from '../lib/supabase';
import { describeWorldEvent } from '../lib/session';
import GameIcon from './GameIcon';

interface Activity { id: string; title: string; body: string; at: string; kind: string }
const formatTime = (at: string) => new Date(at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
const asActivity = (row: WorldEventRow): Activity => ({ id: row.id, title: row.title, body: describeWorldEvent(row), at: row.created_at, kind: row.kind });
const merge = (previous: Activity[], next: Activity[]) => [...new Map([...previous, ...next].map((item) => [item.id, item])).values()].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 4);

export default function WorldActivity({ worldId, enabled }: { worldId: string | undefined; enabled: boolean }) {
  const [items, setItems] = useState<Activity[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!worldId || !enabled) return;
    let active = true;
    const refresh = async () => {
      try {
        const { data, error } = await supabase.from('world_events').select('*').eq('world_id', worldId).order('created_at', { ascending: false }).limit(4);
        if (!active) return;
        setError(Boolean(error));
        if (data) setItems((prev) => merge(prev, (data as WorldEventRow[]).map(asActivity)));
      } catch { if (active) setError(true); }
      finally { if (active) setLoading(false); }
    };
    void refresh();
    const channel = supabase.channel(`jth-activity-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'world_events', filter: `world_id=eq.${worldId}` }, ({ new: row }) => {
        if (active) setItems((prev) => merge(prev, [asActivity(row as WorldEventRow)]));
      }).subscribe((status) => { if (status === 'SUBSCRIBED') void refresh(); });
    const onVisible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; document.removeEventListener('visibilitychange', onVisible); void supabase.removeChannel(channel); };
  }, [worldId, enabled]);

  return <section className="world-activity" aria-labelledby="activity-title">
    <div className="section-heading"><h2 id="activity-title"><GameIcon name="spark" /> Ecos del mundo</h2><span className="activity-kicker">Crónica viva</span></div>
    {!enabled ? <p className="hint">Los ecos volverán al recuperar la conexión.</p> : loading ? <p className="hint" role="status">Escuchando al mundo…</p> : error ? <p className="hint" role="status">No se pudieron actualizar los ecos. Volveremos a intentarlo al reconectar.</p> : items.length === 0 ? <p className="hint">Todavía no hay sucesos. Las decisiones de la mesa dejarán su huella aquí.</p> : null}
    <ol className="activity-list">{items.map((item) => <li key={item.id}>
      <span className={`activity-mark activity-${item.kind}`} aria-hidden="true" />
      <div><div className="activity-meta"><strong>{item.title}</strong><time dateTime={item.at}>{formatTime(item.at)}</time></div><p>{item.body}</p></div>
    </li>)}</ol>
  </section>;
}
