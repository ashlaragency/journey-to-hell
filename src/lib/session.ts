import type { WorldEventRow } from './supabase';

// Scene cues are append-only world events. Older clients can still read their history.
export const SCENE_EVENT_TITLE = 'Escena del Infernalista';

export interface SceneCuePayload {
  type: 'jth.scene.v1';
  adventureId: string;
  sceneIndex: number;
  place: string;
  narration: string;
  director: string;
  active: boolean;
}

export interface SessionCue {
  id: string;
  world_id: string;
  created_at: string;
  payload: SceneCuePayload;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

export function parseSceneCue(row: unknown): SessionCue | null {
  if (!record(row) || row.title !== SCENE_EVENT_TITLE || row.kind !== 'evento'
    || !boundedText(row.id, 100) || !boundedText(row.world_id, 100)
    || !boundedText(row.created_at, 100) || !Number.isFinite(Date.parse(row.created_at))
    || typeof row.body !== 'string' || row.body.length > 30000) return null;
  try {
    const payload: unknown = JSON.parse(row.body);
    if (!record(payload) || payload.type !== 'jth.scene.v1'
      || !boundedText(payload.adventureId, 100)
      || typeof payload.sceneIndex !== 'number' || !Number.isInteger(payload.sceneIndex)
      || payload.sceneIndex < 0 || payload.sceneIndex > 999
      || !boundedText(payload.place, 1000) || !boundedText(payload.narration, 20000)
      || !boundedText(payload.director, 80)
      || (payload.active !== undefined && typeof payload.active !== 'boolean')) return null;
    return {
      id: row.id,
      world_id: row.world_id,
      created_at: row.created_at,
      payload: {
        type: 'jth.scene.v1',
        adventureId: payload.adventureId,
        sceneIndex: payload.sceneIndex,
        place: payload.place,
        narration: payload.narration,
        director: payload.director,
        active: payload.active !== false,
      },
    };
  } catch {
    return null;
  }
}

export function newerCue(previous: SessionCue | null, candidate: SessionCue): SessionCue {
  if (!previous) return candidate;
  const delta = Date.parse(candidate.created_at) - Date.parse(previous.created_at);
  return delta > 0 || (delta === 0 && candidate.id > previous.id) ? candidate : previous;
}

export function describeWorldEvent(row: WorldEventRow): string {
  if (row.title !== SCENE_EVENT_TITLE) return row.body;
  const cue = parseSceneCue(row);
  if (!cue) return 'La mesa tiene una escena que no se pudo leer. Vuelve a sincronizarla.';
  return cue.payload.active
    ? `${cue.payload.director} conduce al grupo a ${cue.payload.place}. ${cue.payload.narration}`
    : `${cue.payload.director} deja el recorrido libre. Cada jugador puede continuar su aventura.`;
}
