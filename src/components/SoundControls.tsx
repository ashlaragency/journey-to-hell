import { useRef, useSyncExternalStore } from 'react';
import {
  getAudioSettings,
  playSound,
  setSoundEnabled,
  setSoundVolume,
  subscribeAudio,
} from '../lib/audio';

export default function SoundControls() {
  const settings = useSyncExternalStore(subscribeAudio, getAudioSettings);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const percentage = Math.round(settings.volume * 100);

  return (
    <details className="sound-controls" ref={detailsRef} onKeyDown={(event) => {
      if (event.key === 'Escape' && detailsRef.current) {
        detailsRef.current.open = false;
        detailsRef.current.querySelector('summary')?.focus();
      }
    }}>
      <summary>
        <span className={`sound-bars ${settings.enabled ? 'sound-bars-on' : ''}`} aria-hidden="true">
          <span /><span /><span />
        </span>
        {settings.enabled ? settings.status === 'unavailable' ? 'Audio no disponible' : 'Sonido activado' : 'Sonido apagado'}
      </summary>
      <div className="sound-panel">
        <div className="sound-setting-row">
          <strong>Efectos de sonido</strong>
          <button type="button" className="sound-switch" role="switch"
            aria-label="Efectos de sonido" aria-checked={settings.enabled}
            onClick={() => setSoundEnabled(!settings.enabled)}>
            <span aria-hidden="true" />
          </button>
        </div>
        <label className="sound-volume-label" htmlFor="sound-volume">
          Volumen <output htmlFor="sound-volume">{percentage}%</output>
        </label>
        <input id="sound-volume" type="range" min={0} max={100} step={5}
          value={percentage} aria-valuetext={`${percentage} por ciento`}
          onChange={(event) => setSoundVolume(Number(event.target.value) / 100)} />
        <button type="button" className="btn sound-preview"
          disabled={!settings.enabled || settings.volume === 0 || settings.status !== 'ready'}
          onClick={() => playSound('dice')}>
          Probar sonido
        </button>
        <p className="hint sound-feedback" role="status">
          {!settings.enabled && 'Actívalo para escuchar tus acciones y los ataques de toda la mesa.'}
          {settings.enabled && settings.status === 'loading' && 'Preparando los sonidos…'}
          {settings.enabled && settings.status === 'unavailable' && 'No se pudo activar el audio en este navegador.'}
          {settings.enabled && settings.status !== 'loading' && settings.status !== 'unavailable' &&
            'Los ataques de la mesa se escuchan en tiempo real. Tu volumen solo cambia aquí.'}
        </p>
        {settings.enabled && settings.status === 'unavailable' && (
          <button type="button" className="btn sound-preview" onClick={() => setSoundEnabled(true)}>
            Reintentar sonido
          </button>
        )}
      </div>
    </details>
  );
}
