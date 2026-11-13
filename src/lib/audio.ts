export type SoundEffect =
  | 'dice'
  | 'hit'
  | 'miss'
  | 'success'
  | 'failure'
  | 'page'
  | 'combat'
  | 'death'
  | 'move'
  | 'select';

type AudioAsset = Exclude<SoundEffect, 'move' | 'select'>;
type AudioStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

export interface AudioSettings {
  readonly enabled: boolean;
  readonly volume: number;
  readonly status: AudioStatus;
}

const STORAGE_KEY = 'jth_audio';
const ASSETS: AudioAsset[] = ['dice', 'hit', 'miss', 'success', 'failure', 'page', 'combat', 'death'];
const MAX_VOICES = 4;
const MAX_DELAY_MS = 180;

function readSettings(): AudioSettings {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && typeof saved === 'object' && 'enabled' in saved && 'volume' in saved) {
      const enabled = typeof saved.enabled === 'boolean' ? saved.enabled : false;
      const volume = typeof saved.volume === 'number' && Number.isFinite(saved.volume)
        ? Math.max(0, Math.min(1, saved.volume))
        : 0.4;
      return Object.freeze({ enabled, volume, status: 'idle' });
    }
  } catch {
    // Sound preferences are optional when browser storage is unavailable.
  }
  return Object.freeze({ enabled: false, volume: 0.4, status: 'idle' });
}

let settings = readSettings();
const listeners = new Set<() => void>();
let context: AudioContext | null = null;
let masterGain: GainNode | null = null;
let resumePromise: Promise<void> | null = null;
let initializationFailed = false;
let resumeFailed = false;
let preloading = false;
let listenersInstalled = false;
let playbackGeneration = 0;
let pendingPlays = 0;
const buffers = new Map<AudioAsset, AudioBuffer>();
const loading = new Map<AudioAsset, Promise<AudioBuffer | null>>();
const failedAssets = new Set<AudioAsset>();
const lastPlayed = new Map<SoundEffect, number>();
const voices = new Map<AudioBufferSourceNode, GainNode>();

export function getAudioSettings(): AudioSettings {
  return settings;
}

export function subscribeAudio(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function updateSettings(next: Partial<AudioSettings>) {
  const updated = { ...settings, ...next };
  if (updated.enabled === settings.enabled && updated.volume === settings.volume && updated.status === settings.status) return;
  settings = Object.freeze(updated);
  for (const listener of listeners) listener();
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: settings.enabled, volume: settings.volume }));
  } catch {
    // Keep the current tab usable even if preferences cannot be persisted.
  }
}

function releaseVoice(source: AudioBufferSourceNode) {
  const gain = voices.get(source);
  source.disconnect();
  gain?.disconnect();
  voices.delete(source);
}

export function stopSounds(): void {
  playbackGeneration++;
  for (const source of voices.keys()) {
    source.stop();
    releaseVoice(source);
  }
  lastPlayed.clear();
}

function onVisibilityChange() {
  if (!document.hidden) return;
  stopSounds();
  if (context?.state === 'running') void context.suspend().catch(() => {});
}

function applyVolume() {
  if (!context || !masterGain) return;
  const now = context.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(settings.enabled ? settings.volume : 0, now + 0.025);
}

async function loadBuffer(asset: AudioAsset): Promise<AudioBuffer | null> {
  const cached = buffers.get(asset);
  if (cached) return cached;
  const pending = loading.get(asset);
  if (pending) return pending;
  if (!context || failedAssets.has(asset)) return null;

  const audioContext = context;
  const task = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(`/audio/${asset}.mp3`, { signal: controller.signal });
      if (!response.ok) throw new Error('Audio asset unavailable');
      const buffer = await audioContext.decodeAudioData(await response.arrayBuffer());
      buffers.set(asset, buffer);
      return buffer;
    } catch {
      failedAssets.add(asset);
      return null;
    } finally {
      clearTimeout(timeout);
      loading.delete(asset);
    }
  })();
  loading.set(asset, task);
  return task;
}

function refreshStatus() {
  let status: AudioStatus = 'idle';
  if (initializationFailed || resumeFailed || failedAssets.size) status = 'unavailable';
  else if (preloading) status = 'loading';
  else if (buffers.size === ASSETS.length && context?.state === 'running') status = 'ready';
  updateSettings({ status });
}

function preload() {
  if (preloading || !context) return;
  preloading = true;
  updateSettings({ status: 'loading' });
  void Promise.all(ASSETS.map(loadBuffer)).then(() => {
    preloading = false;
    refreshStatus();
  });
}

// Call from a pointer/keyboard gesture, before any network await.
export function unlockAudio(): void {
  if (!settings.enabled || document.hidden || initializationFailed) return;
  if (!context) {
    try {
      context = new AudioContext({ latencyHint: 'interactive' });
      masterGain = context.createGain();
      masterGain.gain.value = settings.volume;
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -8;
      compressor.knee.value = 6;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.1;
      masterGain.connect(compressor);
      compressor.connect(context.destination);
      context.onstatechange = refreshStatus;
    } catch {
      if (context) void context.close().catch(() => {});
      context = null;
      masterGain = null;
      initializationFailed = true;
      updateSettings({ status: 'unavailable' });
      return;
    }
    if (!listenersInstalled) {
      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('pagehide', stopSounds);
      listenersInstalled = true;
    }
  }
  if (context.state !== 'running' && !resumePromise) {
    resumeFailed = false;
    try {
      resumePromise = context.resume()
        .catch(() => { resumeFailed = true; })
        .finally(() => {
          resumePromise = null;
          refreshStatus();
        });
    } catch {
      resumeFailed = true;
      refreshStatus();
    }
  }
  if (buffers.size + failedAssets.size < ASSETS.length) preload();
}

export function setSoundEnabled(enabled: boolean): void {
  updateSettings({ enabled });
  saveSettings();
  if (!enabled) {
    stopSounds();
    applyVolume();
    return;
  }
  initializationFailed = false;
  failedAssets.clear();
  unlockAudio();
  applyVolume();
}

export function setSoundVolume(volume: number): void {
  if (!Number.isFinite(volume)) return;
  updateSettings({ volume: Math.max(0, Math.min(1, volume)) });
  saveSettings();
  if (settings.volume === 0) stopSounds();
  applyVolume();
}

function startVoice(effect: SoundEffect, buffer: AudioBuffer) {
  if (!context || !masterGain || context.state !== 'running') return;
  if (voices.size >= MAX_VOICES) {
    const oldest = voices.keys().next().value;
    if (oldest) {
      oldest.stop();
      releaseVoice(oldest);
    }
  }
  let source: AudioBufferSourceNode | null = null;
  let gain: GainNode | null = null;
  try {
    source = context.createBufferSource();
    gain = context.createGain();
    gain.gain.value = effect === 'select' ? 0.35 : effect === 'move' ? 0.55 : 0.8;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(masterGain);
    const playingSource = source;
    source.onended = () => releaseVoice(playingSource);
    source.start();
    voices.set(source, gain);
  } catch {
    source?.disconnect();
    gain?.disconnect();
    updateSettings({ status: 'unavailable' });
  }
}

export function playSound(effect: SoundEffect): void {
  if (!settings.enabled || settings.volume === 0 || document.hidden) return;
  const requestedAt = performance.now();
  if (requestedAt - (lastPlayed.get(effect) ?? -Infinity) < 80 || pendingPlays >= MAX_VOICES) return;
  lastPlayed.set(effect, requestedAt);
  unlockAudio();
  if (!context) return;

  const asset = effect === 'move' || effect === 'select' ? 'page' : effect;
  const generation = playbackGeneration;
  const buffer = buffers.get(asset);
  if (buffer && context.state === 'running') {
    startVoice(effect, buffer);
    return;
  }

  // Expire cues rather than replaying old interactions after a slow load/resume.
  pendingPlays++;
  let timeout: ReturnType<typeof setTimeout>;
  const expired = new Promise<null>((resolve) => {
    timeout = setTimeout(() => resolve(null), MAX_DELAY_MS);
  });
  void Promise.race([
    Promise.all([loadBuffer(asset), resumePromise]).then(([loaded]) => loaded),
    expired,
  ]).then((loaded) => {
    if (loaded && generation === playbackGeneration && settings.enabled && settings.volume > 0 && !document.hidden && performance.now() - requestedAt <= MAX_DELAY_MS) {
      startVoice(effect, loaded);
    }
  }).catch(() => updateSettings({ status: 'unavailable' })).finally(() => {
    clearTimeout(timeout);
    pendingPlays--;
  });
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopSounds();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', stopSounds);
    if (context) void context.close().catch(() => {});
    listeners.clear();
  });
}
