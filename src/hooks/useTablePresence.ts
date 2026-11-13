import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface TableMember { id: string; name: string; role: 'aventurero' | 'infernalista'; joinedAt: number }

function tabIdentity() {
  try {
    const existing = sessionStorage.getItem('jth_table_presence');
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem('jth_table_presence', id);
    return id;
  } catch { return crypto.randomUUID(); }
}

export function useTablePresence(worldId: string | undefined, enabled: boolean, name: string, role: TableMember['role']) {
  const [members, setMembers] = useState<TableMember[]>([]);
  const [connected, setConnected] = useState(false);
  const [id] = useState(tabIdentity);
  useEffect(() => {
    if (!worldId || !enabled) return;
    let active = true;
    const channel = supabase.channel(`jth-table-${worldId}`, { config: { presence: { key: id } } });
    channel.on('presence', { event: 'sync' }, () => {
      if (!active) return;
      const rows = Object.values(channel.presenceState()).flat();
      const next = rows.flatMap((row) => {
        const item = row as unknown as Partial<TableMember>;
        return typeof item.id === 'string' && typeof item.name === 'string' && (item.role === 'aventurero' || item.role === 'infernalista')
          ? [{ id: item.id, name: item.name.slice(0, 40), role: item.role, joinedAt: typeof item.joinedAt === 'number' ? item.joinedAt : 0 }] : [];
      });
      // A reconnect can overlap its old connection until the server expires it.
      // Stable per-tab IDs keep a reload from briefly counting the same person twice.
      setMembers([...new Map(next.sort((a, b) => a.joinedAt - b.joinedAt).map((member) => [member.id, member])).values()]);
    }).subscribe(async (status) => {
      if (!active) return;
      setConnected(status === 'SUBSCRIBED');
      if (status === 'SUBSCRIBED') {
        if (name) await channel.track({ id, name, role, joinedAt: Date.now() });
      } else setMembers([]);
    });
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [worldId, enabled, name, role, id]);
  return { members: enabled ? members : [], connected: enabled && connected };
}
