import { useCombatEffects } from '../hooks/useCombatEffects';
import './CombatEffects.css';

interface CombatEffectsProps {
  worldId: string | null | undefined;
  schemaOk: boolean;
  motionPaused?: boolean;
}

export default function CombatEffects({ worldId, schemaOk, motionPaused = false }: CombatEffectsProps) {
  const event = useCombatEffects(worldId, schemaOk);
  if (!event) return null;
  return (
    <div className={`combat-effect-layer ${motionPaused ? 'is-static' : ''}`} data-effect={event.hit ? 'hit' : 'miss'} data-attack-id={event.id} key={event.id}>
      <div className="combat-effect-strike" aria-hidden="true">
        <svg viewBox="0 0 700 420" className="combat-effect-slash"><path className="effect-arc-shadow" d="M120 330 Q300 100 590 65 Q405 210 235 355" /><path className="effect-arc" d="M120 330 Q300 100 590 65 Q405 210 235 355" /><path className="effect-trail" d="M130 320 Q330 80 590 65" /></svg>
        <span className="combat-effect-ripple" />
        <span className="combat-effect-spark spark-one" /><span className="combat-effect-spark spark-two" /><span className="combat-effect-spark spark-three" />
      </div>
      <div className="combat-effect-banner" role="status" aria-live="polite" aria-atomic="true" data-effect-id={event.id}>
        <span className="combat-effect-number" aria-hidden="true">{event.hit ? `−${event.damage}` : '↗'}</span>
        <div><p className="combat-effect-label">{event.hit ? 'Impacto' : 'Ataque esquivado'}</p><p className="combat-effect-target"><strong>{event.attacker}</strong><span aria-hidden="true"> → </span><span className="effect-sr"> ataca a </span><strong>{event.target}</strong></p><p className="combat-effect-detail">{event.hit ? `${event.damage} de daño` : 'Sin daño'}</p></div>
      </div>
    </div>
  );
}
