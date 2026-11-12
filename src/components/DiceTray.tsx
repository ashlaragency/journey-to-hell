// Bandeja de dados para "Journey to Hell": tira dados, anima el resultado,
// lo guarda en Supabase y muestra las últimas tiradas del mundo en vivo.
import { useEffect, useRef, useState } from 'react';
import { supabase, saveRoll, parseAndRoll, type CharacterRow } from '../lib/supabase';

const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const;
type DiceSides = (typeof DICE_SIDES)[number];
type RollMode = 'ventaja' | 'normal' | 'desventaja';

interface RollItem {
  id: string;
  player_name: string | null;
  character_name: string | null;
  label: string;
  dice: string;
  result: number;
  detail: string | null;
  created_at: string;
}

function fmtSigned(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

interface DiceTrayProps {
  worldId: string | null;
  playerName: string;
  characterName: string | null;
}

export default function DiceTray({ worldId, playerName, characterName }: DiceTrayProps) {
  const [sides, setSides] = useState<DiceSides>(20);
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [mode, setMode] = useState<RollMode>('normal');
  const [rolling, setRolling] = useState(false);
  const [display, setDisplay] = useState<number | null>(null);
  const [faces, setFaces] = useState<number[] | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [detail, setDetail] = useState('');
  const [rolls, setRolls] = useState<RollItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Nombre del personaje que tira, con el tipo de la fila de personaje.
  const heroName: CharacterRow['name'] | null = characterName;

  const hasAdvantage = sides === 20 && mode !== 'normal';

  // Últimas 10 tiradas del mundo + suscripción en vivo a las nuevas.
  useEffect(() => {
    if (!worldId) {
      setRolls([]);
      return;
    }
    let cancelled = false;
    supabase
      .from('dice_rolls')
      .select('*')
      .eq('world_id', worldId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('No se pudieron cargar las tiradas:', error.message);
          return;
        }
        setRolls((data ?? []) as RollItem[]);
      });

    const channel = supabase
      .channel(`dice-rolls-${worldId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dice_rolls',
          filter: `world_id=eq.${worldId}`,
        },
        (payload) => {
          const row = payload.new as RollItem;
          setRolls((prev) => [row, ...prev].slice(0, 10));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [worldId]);

  // Limpia los temporizadores de la animación al desmontar.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function stopAnimationTimers() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  }

  function handleRoll() {
    if (rolling) return;
    stopAnimationTimers();
    setRolling(true);
    setFaces(null);
    setResult(null);
    setDetail('');

    // Números aleatorios mientras "rueda" el dado (~600 ms).
    intervalRef.current = setInterval(() => {
      setDisplay(1 + Math.floor(Math.random() * sides));
    }, 90);

    timerRef.current = setTimeout(() => {
      stopAnimationTimers();
      let finalResult: number;
      let finalFaces: number[];
      let finalDetail: string;
      let spec: string;

      if (hasAdvantage) {
        // Ventaja / desventaja solo afecta al d20: tira 2 y se queda el mayor/menor.
        const { total, detail: rawDetail } = parseAndRoll('2d20');
        const pair = rawDetail
          .split(' = ')[0]
          .split(' + ')
          .map((n) => parseInt(n, 10))
          .filter((n) => !Number.isNaN(n));
        const kept = mode === 'ventaja' ? Math.max(...pair) : Math.min(...pair);
        finalFaces = pair;
        finalResult = kept + modifier;
        spec = `2d20${modifier !== 0 ? fmtSigned(modifier) : ''}`;
        finalDetail =
          `${mode === 'ventaja' ? 'Ventaja' : 'Desventaja'}: ${pair.join(' y ')} → se queda ${kept}` +
          (modifier !== 0 ? ` ${fmtSigned(modifier)} = ${finalResult}` : ` = ${finalResult}`);
        void total;
      } else {
        const specBase = `${count}d${sides}`;
        const { total, detail: rawDetail } = parseAndRoll(specBase);
        const rolled = rawDetail
          .split(' = ')[0]
          .split(' + ')
          .map((n) => parseInt(n, 10))
          .filter((n) => !Number.isNaN(n));
        finalFaces = rolled;
        finalResult = total + modifier;
        spec = `${specBase}${modifier !== 0 ? fmtSigned(modifier) : ''}`;
        finalDetail =
          modifier !== 0
            ? `${rolled.join(' + ')} ${fmtSigned(modifier)} = ${finalResult}`
            : `${rolled.join(' + ')} = ${finalResult}`;
      }

      setDisplay(finalResult);
      setFaces(finalFaces);
      setResult(finalResult);
      setDetail(finalDetail);
      setRolling(false);

      void saveRoll({
        world_id: worldId,
        player_name: playerName,
        character_name: heroName,
        label: `Tirada d${sides}`,
        dice: spec,
        result: finalResult,
        detail: finalDetail,
      });
    }, 600);
  }

  return (
    <div className="dice-tray">
      <h2>🎲 Bandeja de dados</h2>
      {heroName && <p>Tirando como {heroName}</p>}

      <div>
        <h3>Dado</h3>
        <div>
          {DICE_SIDES.map((d) => (
            <button
              type="button"
              key={d}
              className={`chip${sides === d ? ' chip-selected' : ''}`}
              onClick={() => setSides(d)}
            >
              d{d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3>Cantidad</h3>
        <div>
          <button type="button" className="btn" disabled={count <= 1} onClick={() => setCount((c) => Math.max(1, c - 1))}>
            −
          </button>
          <span>
            {count}d{sides}
          </span>
          <button type="button" className="btn" disabled={count >= 5} onClick={() => setCount((c) => Math.min(5, c + 1))}>
            +
          </button>
        </div>
      </div>

      <div>
        <h3>Modificador</h3>
        <div>
          <button
            type="button"
            className="btn"
            disabled={modifier <= -5}
            onClick={() => setModifier((m) => Math.max(-5, m - 1))}
          >
            −
          </button>
          <span>{fmtSigned(modifier)}</span>
          <button
            type="button"
            className="btn"
            disabled={modifier >= 10}
            onClick={() => setModifier((m) => Math.min(10, m + 1))}
          >
            +
          </button>
        </div>
      </div>

      <div>
        <h3>Suerte</h3>
        <div>
          <button
            type="button"
            className={`btn${mode === 'ventaja' ? ' btn-primary' : ''}`}
            onClick={() => setMode('ventaja')}
          >
            Ventaja
          </button>
          <button
            type="button"
            className={`btn${mode === 'normal' ? ' btn-primary' : ''}`}
            onClick={() => setMode('normal')}
          >
            Normal
          </button>
          <button
            type="button"
            className={`btn${mode === 'desventaja' ? ' btn-primary' : ''}`}
            onClick={() => setMode('desventaja')}
          >
            Desventaja
          </button>
        </div>
        {mode !== 'normal' && sides !== 20 && (
          <p>La ventaja y la desventaja solo afectan al d20: con este dado se tira normal.</p>
        )}
        {mode !== 'normal' && sides === 20 && (
          <p>
            {mode === 'ventaja' ? 'Se tiran 2d20 y se queda el mayor.' : 'Se tiran 2d20 y se queda el menor.'}
          </p>
        )}
      </div>

      <button type="button" className="btn btn-primary" disabled={rolling} onClick={handleRoll}>
        🎲 Tirar
      </button>

      {display !== null && (
        <div>
          <p className={rolling ? 'dice-rolling' : ''}>{display}</p>
          {!rolling && faces && (
            <p>
              Caras: {faces.join(', ')}
              {result !== null && detail ? ` · ${detail}` : ''}
            </p>
          )}
          {rolling && <p>Rodando…</p>}
        </div>
      )}

      <div>
        <h3>Últimas tiradas</h3>
        {!worldId && <p>Elige un mundo para ver las tiradas de todos.</p>}
        {worldId && rolls.length === 0 && <p>Todavía no hay tiradas en este mundo. ¡Sé la primera persona en tirar!</p>}
        <ul>
          {rolls.map((r) => (
            <li key={r.id}>
              <strong>{r.player_name ?? 'Alguien'}</strong>
              {r.character_name ? ` (${r.character_name})` : ''} · {r.label} ({r.dice}) →{' '}
              <strong>{r.result}</strong>
              {r.detail ? ` · ${r.detail}` : ''}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
