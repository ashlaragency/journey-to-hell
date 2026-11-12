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
    if (!worldId) return;
    const controller = new AbortController();

    function mergeRolls(incoming: RollItem[]) {
      if (controller.signal.aborted) return;
      setRolls((previous) => {
        const unique = new Map(previous.map((roll) => [roll.id, roll]));
        for (const roll of incoming) unique.set(roll.id, roll);
        return [...unique.values()]
          .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
          .slice(0, 10);
      });
    }

    async function loadRolls() {
      const { data, error } = await supabase
        .from('dice_rolls')
        .select('*')
        .eq('world_id', worldId)
        .order('created_at', { ascending: false })
        .limit(10)
        .abortSignal(controller.signal);
      if (controller.signal.aborted) return;
      if (error) {
        console.warn('No se pudieron cargar las tiradas:', error.message);
        return;
      }
      mergeRolls(data as RollItem[]);
    }

    const channel = supabase
      .channel(`dice-rolls-${worldId}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dice_rolls',
          filter: `world_id=eq.${worldId}`,
        },
        (payload) => {
          mergeRolls([payload.new as RollItem]);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          void loadRolls();
        }
      });

    return () => {
      controller.abort();
      void supabase.removeChannel(channel);
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
    <section className="dice-tray card" aria-labelledby="dice-title">
      <h2 id="dice-title">Mesa de dados</h2>
      {heroName && <p className="hint">Tirando como {heroName}</p>}

      <div className={`die-display${rolling ? ' dice-rolling' : ''}`} aria-hidden="true">
        <span>{display ?? `d${sides}`}</span>
      </div>
      <p className="dice-result-detail" role="status">
        {rolling ? 'Rodando…' : result !== null ? `Resultado ${result}. ${detail}` : 'Elige un dado y tira.'}
      </p>
      {!rolling && faces && <p className="hint dice-faces-detail">Caras {faces.join(', ')}</p>}

      <div className="dice-types" role="group" aria-label="Tipo de dado">
        {DICE_SIDES.map((d) => (
          <button
            type="button"
            key={d}
            className={`chip${sides === d ? ' chip-selected' : ''}`}
            aria-pressed={sides === d}
            onClick={() => setSides(d)}
          >
            d{d}
          </button>
        ))}
      </div>

      <div className="dice-adjustments">
        <div>
          <h3>Cantidad</h3>
          <div className="dice-stepper">
            <button type="button" className="btn" aria-label="Quitar un dado" disabled={count <= 1} onClick={() => setCount((c) => Math.max(1, c - 1))}>−</button>
            <span>{count}d{sides}</span>
            <button type="button" className="btn" aria-label="Añadir un dado" disabled={count >= 5} onClick={() => setCount((c) => Math.min(5, c + 1))}>+</button>
          </div>
        </div>
        <div>
          <h3>Modificador</h3>
          <div className="dice-stepper">
            <button type="button" className="btn" aria-label="Reducir modificador" disabled={modifier <= -5} onClick={() => setModifier((m) => Math.max(-5, m - 1))}>−</button>
            <span>{fmtSigned(modifier)}</span>
            <button type="button" className="btn" aria-label="Aumentar modificador" disabled={modifier >= 10} onClick={() => setModifier((m) => Math.min(10, m + 1))}>+</button>
          </div>
        </div>
      </div>

      <div className="dice-modes" role="group" aria-label="Suerte de la tirada">
        {(['normal', 'ventaja', 'desventaja'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`btn${mode === value ? ' btn-primary' : ''}`}
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
          >
            {value === 'normal' ? 'Normal' : value === 'ventaja' ? 'Ventaja' : 'Desventaja'}
          </button>
        ))}
      </div>
      {mode !== 'normal' && (
        <p className="hint">
          {sides !== 20
            ? 'La ventaja y la desventaja solo afectan al d20. Este dado se tira normal.'
            : mode === 'ventaja'
              ? 'Se tiran 2d20 y se queda el mayor.'
              : 'Se tiran 2d20 y se queda el menor.'}
        </p>
      )}

      <button type="button" className="btn btn-primary roll-button" disabled={rolling} onClick={handleRoll}>
        {rolling ? 'Tirando…' : `Tirar ${hasAdvantage ? '2d20' : `${count}d${sides}`}`}
      </button>

      <div className="roll-history">
        <h3>Últimas tiradas</h3>
        {!worldId && <p className="hint">Conecta con el mundo para ver las tiradas de todos.</p>}
        {worldId && rolls.length === 0 && <p className="hint">Todavía no hay tiradas en este mundo.</p>}
        <ul tabIndex={0} aria-label="Historial de tiradas">
          {rolls.map((r) => (
            <li key={r.id}>
              <div className="roll-history-copy">
                <strong>{r.player_name || 'Alguien'}</strong>
                {r.character_name && <span>{r.character_name}</span>}
                <span>{r.label} ({r.dice})</span>
                {r.detail && <small>{r.detail}</small>}
              </div>
              <b className="roll-total" aria-label={`Resultado ${r.result}`}>{r.result}</b>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
