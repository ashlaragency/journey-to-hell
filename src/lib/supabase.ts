// Cliente de Supabase (solo clave anon pública) y tipos del juego.
import { createClient } from '@supabase/supabase-js';
import type { CombatAttackEvent } from './combatEffects';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://lewyzkdhwrdiiorwsfgh.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxld3l6a2Rod3JkaWlvcndzZmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzNTQ0NTgsImV4cCI6MjEwOTkzMDQ1OH0.4eFrqriIu-B-tteFXvttKIee7mgDYjlN-NVNZt8zcHU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface World {
  id: string;
  name: string;
  premise: string | null;
  law: string | null;
  created_at: string;
}

export interface CharacterRow {
  id: string;
  world_id: string | null;
  name: string;
  species: string;
  class_name: string;
  level: number;
  background: string | null;
  personality: string | null;
  motivation: string | null;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  max_hp: number;
  hp: number;
  ac: number;
  weapon: string | null;
  armor: string | null;
  shield: boolean;
  pack: string | null;
  skills: string[];
  notes: string | null;
  status: 'vivo' | 'caido';
  death_note: string | null;
  owner_name: string | null;
  created_at: string;
}

export interface LegacyRow {
  id: string;
  world_id: string | null;
  character_id: string | null;
  character_name: string;
  kind: 'tumba' | 'cancion' | 'leyenda' | 'objeto' | 'lugar';
  title: string;
  body: string;
  place: string | null;
  created_at: string;
}

export interface AdventureRow {
  id: string;
  world_id: string | null;
  name: string;
  duration: 'corta' | 'media' | 'larga';
  duration_label: string;
  description: string | null;
  open_ending: string | null;
  hooks: string | null;
  growth: string | null;
}

export interface SceneRow {
  id: string;
  adventure_id: string;
  position: number;
  place: string;
  narration: string;
}

export interface EnemyRow {
  id: string;
  adventure_id: string;
  name: string;
  hp: number;
  ac: number;
  attack_bonus: number;
  damage_dice: string;
}

export interface Combatant {
  kind: 'pc' | 'enemy';
  last_attack?: CombatAttackEvent;
  /** En la retaguardia: su jugador se fue. No actúa ni puede ser atacado. */
  away?: boolean;
  /** Casilla elegida en el tablero. Sin ella, la ficha ocupa su sitio en la formación. */
  pos?: { x: number; y: number };
  ref_id: string;
  name: string;
  initiative: number;
  hp: number;
  max_hp: number;
  ac: number;
}

export interface CombatRow {
  id: string;
  world_id: string | null;
  adventure_id: string | null;
  active: boolean;
  round: number;
  turn_index: number;
  combatants: Combatant[];
  log: string[];
  created_at: string;
  updated_at: string;
}

export interface DiceRollRow {
  id: string;
  world_id: string | null;
  player_name: string | null;
  character_name: string | null;
  label: string;
  dice: string;
  result: number;
  detail: string | null;
  created_at: string;
}

export interface JournalRow {
  id: string;
  world_id: string | null;
  title: string | null;
  body: string;
  kind: 'cronica' | 'rumor' | 'evento' | 'consecuencia' | 'evolucion';
  created_at: string;
}

export interface WorldEventRow {
  id: string;
  world_id: string | null;
  kind: 'rumor' | 'evento' | 'consecuencia' | 'evolucion_pnj';
  title: string;
  body: string;
  created_at: string;
}

export interface BattleMapRow {
  id: string;
  world_id: string | null;
  name: string;
  grid_size: number;
  background: string;
  tokens: MapToken[];
  created_at: string;
}

export interface MapToken {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  hp: number;
  max_hp: number;
  icon: string;
}

// Nombre del jugador, guardado en su navegador (sin cuentas ni login).
export function getPlayerName(): string {
  return localStorage.getItem('jth_player') ?? '';
}
export function setPlayerName(name: string) {
  localStorage.setItem('jth_player', name);
}

// Comprueba si las tablas existen (el SQL ya se aplicó o no).
export async function checkSchema(): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.from('worlds').select('id').limit(1);
  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}

export async function saveRoll(roll: {
  world_id: string | null;
  player_name: string;
  character_name: string | null;
  label: string;
  dice: string;
  result: number;
  detail: string;
}) {
  const { error } = await supabase.from('dice_rolls').insert(roll);
  if (error) console.warn('No se pudo guardar la tirada:', error.message);
}

// Tira dados tipo "2d6+3" y devuelve el total y el detalle.
export function parseAndRoll(spec: string): { total: number; detail: string } {
  const m = spec.trim().match(/^(\d*)d(\d+)\s*([+-]\s*\d+)?$/i);
  if (!m) {
    const n = parseInt(spec, 10);
    return { total: isNaN(n) ? 0 : n, detail: spec };
  }
  const count = m[1] ? parseInt(m[1], 10) : 1;
  const sides = parseInt(m[2], 10);
  const mod = m[3] ? parseInt(m[3].replace(/\s/g, ''), 10) : 0;
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) rolls.push(1 + Math.floor(Math.random() * sides));
  const sum = rolls.reduce((a, b) => a + b, 0);
  const detail = `${rolls.join(' + ')}${mod !== 0 ? ` ${mod > 0 ? '+' : '-'} ${Math.abs(mod)}` : ''} = ${sum + mod}`;
  return { total: sum + mod, detail };
}
