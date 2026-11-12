// Creador guiado de personaje para "Journey to Hell".
// Regla dura: el único campo que se escribe en todo el flujo es el nombre.
// Todo lo demás se elige tocando tarjetas, chips o botones.
import { playSound } from '../lib/audio';
import { useState } from 'react';
import {
  SPECIES,
  CLASSES,
  BACKGROUNDS,
  SKILLS,
  WEAPONS,
  ARMORS,
  PACKS,
  PERSONALITIES,
  MOTIVATIONS,
  ABILITY_NAMES,
  ABILITY_HELP,
  ABILITIES,
  abilityMod,
  proficiencyBonus,
  calcAC,
  rollDie,
  roll4d6DropLowest,
  type ClassOpt,
  type SpeciesOpt,
  type BackgroundOpt,
} from '../lib/data';
import { supabase, type CharacterRow } from '../lib/supabase';

type AbilityKey = (typeof ABILITIES)[number];
type Scores = Record<AbilityKey, number>;
type HpOption = 'completa' | 'mitad' | 'casi';

const STEP_TITLES = [
  'Nombre',
  'Especie',
  'Clase',
  'Trasfondo',
  'Características',
  'Habilidades',
  'Equipo',
  'Personalidad',
  'Resumen',
];

const GENERIC_NAMES = ['Aria', 'Bruno', 'Carmen', 'Diego', 'Elena', 'Félix', 'Luna', 'Mateo'];
const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

const HP_OPTIONS: { id: HpOption; label: string; desc: string }[] = [
  { id: 'completa', label: 'Completa', desc: 'Empiezas con toda tu vida' },
  { id: 'mitad', label: 'A la mitad', desc: 'Ya vienes de una pelea' },
  { id: 'casi', label: 'Casi caído', desc: 'Solo 1 punto de vida' },
];

// El arma por defecto de Hechicero y Brujo es "Daga", que no está en WEAPONS:
// la más cercana es "Par de dagas".
function resolveDefaultWeapon(name: string): string {
  if (WEAPONS.some((w) => w.name === name)) return name;
  if (name === 'Daga') return 'Par de dagas';
  return WEAPONS[0].name;
}

function resolveDefaultArmor(name: string): string {
  return ARMORS.some((a) => a.name === name) ? name : 'Sin armadura';
}

function fmtMod(score: number): string {
  const m = abilityMod(score);
  return m >= 0 ? `+${m}` : `${m}`;
}

interface CharacterCreatorProps {
  worldId: string | null;
  playerName: string;
  onCreated: (c: CharacterRow) => void;
  onCancel: () => void;
  schemaOk: boolean;
}

export default function CharacterCreator({
  worldId,
  playerName,
  onCreated,
  onCancel,
  schemaOk,
}: CharacterCreatorProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<SpeciesOpt | null>(null);
  const [cls, setCls] = useState<ClassOpt | null>(null);
  const [background, setBackground] = useState<BackgroundOpt | null>(null);
  const [scores, setScores] = useState<Scores | null>(null);
  const [scoreMethod, setScoreMethod] = useState<'recomendado' | 'dados' | null>(null);
  const [swapPick, setSwapPick] = useState<AbilityKey | null>(null);
  const [chosenSkills, setChosenSkills] = useState<string[]>([]);
  const [weapon, setWeapon] = useState('');
  const [armor, setArmor] = useState('');
  const [shield, setShield] = useState(false);
  const [pack, setPack] = useState('');
  const [personality, setPersonality] = useState('');
  const [motivation, setMotivation] = useState('');
  const [hpOption, setHpOption] = useState<HpOption>('completa');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const backgroundSkills = background?.skills ?? [];
  const allSkills = [...backgroundSkills, ...chosenSkills];
  const conScore = scores?.CON ?? 10;
  const maxHp = cls ? cls.hitDie + abilityMod(conScore) : 0;
  const startHp =
    hpOption === 'completa' ? maxHp : hpOption === 'mitad' ? Math.max(1, Math.floor(maxHp / 2)) : 1;
  const ac = cls
    ? calcAC(armor || 'Sin armadura', scores?.DES ?? 10, shield, cls.name, scores?.SAB ?? 10, conScore)
    : 10;

  function randomName() {
    const pool = species ? species.names : GENERIC_NAMES;
    setName(pool[rollDie(pool.length) - 1]);
  }

  function pickSpecies(s: SpeciesOpt) {
    setSpecies(s);
    // El caparazón natural solo existe si la especie es Tortle.
    if (s.name !== 'Tortle' && armor === 'Caparazón natural') setArmor('Sin armadura');
  }

  function pickClass(c: ClassOpt) {
    setCls(c);
    setWeapon(resolveDefaultWeapon(c.defaultWeapon));
    setArmor(resolveDefaultArmor(c.defaultArmor));
    setChosenSkills([]);
    setScores(null);
    setScoreMethod(null);
    setSwapPick(null);
  }

  function pickBackground(b: BackgroundOpt) {
    setBackground(b);
  }

  function applyRecommended() {
    if (!cls) return;
    const order: AbilityKey[] = [
      cls.primary,
      'CON',
      'DES',
      ...ABILITIES.filter((a) => a !== cls.primary && a !== 'CON' && a !== 'DES'),
    ];
    const next = {} as Scores;
    order.forEach((ability, i) => {
      next[ability] = STANDARD_ARRAY[i];
    });
    setScores(next);
    setScoreMethod('recomendado');
    setSwapPick(null);
  }

  function rollScores() {
    const next = {} as Scores;
    ABILITIES.forEach((ability) => {
      next[ability] = roll4d6DropLowest();
    });
    setScores(next);
    setScoreMethod('dados');
    setSwapPick(null);
  }

  function tapAbility(ability: AbilityKey) {
    if (!scores) return;
    if (swapPick === null) {
      setSwapPick(ability);
      return;
    }
    if (swapPick === ability) {
      setSwapPick(null);
      return;
    }
    const next = { ...scores };
    next[swapPick] = scores[ability];
    next[ability] = scores[swapPick];
    setScores(next);
    setSwapPick(null);
  }

  function toggleSkill(skill: string) {
    setChosenSkills((prev) => {
      if (prev.includes(skill)) return prev.filter((s) => s !== skill);
      if (!cls || prev.length >= cls.skillCount) return prev;
      return [...prev, skill];
    });
  }

  function skillAbility(skill: string): string {
    return SKILLS.find((s) => s.name === skill)?.ability ?? '';
  }

  function canNext(): boolean {
    switch (step) {
      case 1:
        return name.trim().length > 0;
      case 2:
        return species !== null;
      case 3:
        return cls !== null;
      case 4:
        return background !== null;
      case 5:
        return scores !== null;
      case 6:
        return !!cls && chosenSkills.length === cls.skillCount;
      case 7:
        return weapon !== '' && armor !== '' && pack !== '';
      case 8:
        return personality !== '' && motivation !== '';
      default:
        return true;
    }
  }

  async function handleCreate() {
    if (!schemaOk || !cls || !species || !background || !scores || !name.trim()) return;
    setCreating(true);
    setError('');
    const notes =
      `Trasfondo: ${background.name} · Así es: ${personality} · Busca: ${motivation} · ` +
      `Se le da bien: ${allSkills.join(', ')} · Arma: ${weapon} · Armadura: ${armor}`;
    const { data, error: insertError } = await supabase
      .from('characters')
      .insert({
        world_id: worldId,
        name: name.trim(),
        species: species.name,
        class_name: cls.name,
        level: 1,
        background: background.name,
        personality,
        motivation,
        str: scores.FUE,
        dex: scores.DES,
        con: scores.CON,
        int: scores.INT,
        wis: scores.SAB,
        cha: scores.CAR,
        max_hp: maxHp,
        hp: startHp,
        ac,
        weapon,
        armor,
        shield,
        pack,
        skills: allSkills,
        notes,
        status: 'vivo',
        owner_name: playerName,
      })
      .select()
      .single();
    setCreating(false);
    if (insertError) {
      playSound('failure');
      if (insertError.code === '23505') {
        setError('Ese nombre ya lo usó un héroe (vivo o caído) y no se puede repetir. Elige otro nombre.');
      } else {
        setError(`No se pudo crear el personaje: ${insertError.message}`);
      }
      return;
    }
    playSound('success');
    onCreated(data as CharacterRow);
  }

  return (
    <div className="character-creator">
      <div>
        <h2>Crea tu héroe</h2>
        <p>
          Paso {step} de 9: {STEP_TITLES[step - 1]}
        </p>
        <button type="button" className="btn" onClick={onCancel}>
          ✕ Cancelar
        </button>
      </div>

      {!schemaOk && (
        <p className="banner">
          Las tablas del juego aún no están listas en Supabase (falta aplicar schema.sql).
          Puedes recorrer el creador, pero no se podrá guardar el personaje.
        </p>
      )}

      {step === 1 && (
        <div>
          <p className="banner">Solo escribes una cosa: el nombre. Todo lo demás se elige tocando.</p>
          <label htmlFor="hero-name">Nombre de tu héroe</label>
          <input
            id="hero-name"
            type="text"
            value={name}
            maxLength={40}
            placeholder="Escribe el nombre de tu héroe"
            onChange={(e) => setName(e.target.value)}
          />
          <button type="button" className="btn" onClick={randomName}>
            🎲 Nombre al azar
          </button>
          {species && <p>Ideas para {species.name}: {species.names.join(', ')}</p>}
        </div>
      )}

      {step === 2 && (
        <div>
          <h3>¿Qué es tu héroe?</h3>
          <div className="grid-cards">
            {SPECIES.map((s) => (
              <button
                type="button"
                key={s.name}
                className={`card${species?.name === s.name ? ' card-selected' : ''}`}
                onClick={() => pickSpecies(s)}
              >
                <strong>{s.name}</strong>
                <p>{s.desc}</p>
                <p>💪 {s.strength}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h3>¿A qué se dedica tu héroe?</h3>
          <div className="grid-cards">
            {CLASSES.map((c) => (
              <button
                type="button"
                key={c.name}
                className={`card${cls?.name === c.name ? ' card-selected' : ''}`}
                onClick={() => pickClass(c)}
              >
                <strong>{c.name}</strong>
                <p>{c.role}</p>
                <p>Dificultad: {c.difficulty}</p>
                <p>Dado de golpe: d{c.hitDie}</p>
                <p>{c.desc}</p>
              </button>
            ))}
          </div>
          {cls && (
            <p>
              Con {cls.name} empiezas con {weapon} y {armor}.
            </p>
          )}
        </div>
      )}

      {step === 4 && (
        <div>
          <h3>¿De dónde viene tu héroe?</h3>
          <div className="grid-cards">
            {BACKGROUNDS.map((b) => (
              <button
                type="button"
                key={b.name}
                className={`card${background?.name === b.name ? ' card-selected' : ''}`}
                onClick={() => pickBackground(b)}
              >
                <strong>{b.name}</strong>
                <p>{b.desc}</p>
                <p>Se le da bien: {b.skills.join(' y ')}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 5 && (
        <div>
          <h3>¿Qué tan bueno es en cada cosa?</h3>
          <div>
            <button type="button" className="btn btn-primary" onClick={applyRecommended}>
              ✨ Reparto recomendado
            </button>
            <button type="button" className="btn" onClick={rollScores}>
              🎲 Tirar los dados
            </button>
            {scoreMethod === 'dados' && (
              <button type="button" className="btn" onClick={rollScores}>
                ↻ Volver a tirar
              </button>
            )}
          </div>
          {cls && scoreMethod === 'recomendado' && (
            <p>
              Reparto pensado para {cls.name}: lo mejor en {ABILITY_NAMES[cls.primary]}, luego
              Constitución y Destreza.
            </p>
          )}
          {scoreMethod === 'dados' && (
            <p>Cada número es 4d6 quitando el dado más bajo. Toca dos características para intercambiarlas.</p>
          )}
          {scores && (
            <div>
              <p>
                <strong>Intercambiar:</strong> toca una característica y luego otra para cambiar sus
                valores de lugar.
                {swapPick && ` Cambiando ${ABILITY_NAMES[swapPick]}… toca la otra.`}
              </p>
              <div className="grid-cards">
                {ABILITIES.map((ability) => (
                  <button
                    type="button"
                    key={ability}
                    className={`card${swapPick === ability ? ' card-selected' : ''}`}
                    onClick={() => tapAbility(ability)}
                  >
                    <strong>{ABILITY_NAMES[ability]}</strong>
                    <p>
                      {scores[ability]} ({fmtMod(scores[ability])})
                    </p>
                    <p>{ABILITY_HELP[ability]}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {!scores && <p>Elige una de las dos formas para repartir tus números.</p>}
        </div>
      )}

      {step === 6 && (
        <div>
          <h3>¿En qué es bueno tu héroe?</h3>
          {background && (
            <div>
              <p>Por tu trasfondo ({background.name}) ya sabes hacer esto ⭐:</p>
              <div>
                {backgroundSkills.map((skill) => (
                  <span key={skill} className="chip chip-selected">
                    ⭐ {skill} ({skillAbility(skill)})
                  </span>
                ))}
              </div>
              <p>Estas no cuentan del cupo de tu clase.</p>
            </div>
          )}
          {cls && (
            <div>
              <p>
                Elige {cls.skillCount} de tu clase ({chosenSkills.length} de {cls.skillCount}):
              </p>
              <div>
                {cls.skills.map((skill) => {
                  const selected = chosenSkills.includes(skill);
                  const full = !selected && chosenSkills.length >= cls.skillCount;
                  return (
                    <button
                      type="button"
                      key={skill}
                      className={`chip${selected ? ' chip-selected' : ''}`}
                      disabled={full}
                      onClick={() => toggleSkill(skill)}
                    >
                      {skill} ({skillAbility(skill)})
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 7 && (
        <div>
          <h3>¿Con qué pelea y se protege tu héroe?</h3>
          <h4>Arma</h4>
          <div className="grid-cards">
            {WEAPONS.map((w) => (
              <button
                type="button"
                key={w.name}
                className={`card${weapon === w.name ? ' card-selected' : ''}`}
                onClick={() => setWeapon(w.name)}
              >
                <strong>{w.name}</strong>
                <p>
                  {w.dice} · {w.type}
                </p>
              </button>
            ))}
          </div>
          <h4>Armadura</h4>
          <div className="grid-cards">
            {ARMORS.filter((a) => !a.tortleOnly || species?.name === 'Tortle').map((a) => (
              <button
                type="button"
                key={a.name}
                className={`card${armor === a.name ? ' card-selected' : ''}`}
                onClick={() => setArmor(a.name)}
              >
                <strong>{a.name}</strong>
                <p>{a.desc}</p>
              </button>
            ))}
          </div>
          <h4>Escudo</h4>
          <div>
            <button
              type="button"
              className={`btn${shield ? ' btn-primary' : ''}`}
              onClick={() => setShield(true)}
            >
              🛡️ Con escudo (+2 a la defensa)
            </button>
            <button
              type="button"
              className={`btn${!shield ? ' btn-primary' : ''}`}
              onClick={() => setShield(false)}
            >
              Sin escudo
            </button>
          </div>
          <h4>Mochila</h4>
          <div>
            {PACKS.map((p) => (
              <button
                type="button"
                key={p}
                className={`chip${pack === p ? ' chip-selected' : ''}`}
                onClick={() => setPack(p)}
              >
                {p}
              </button>
            ))}
          </div>
          {cls && scores && (
            <p>
              <strong>Defensa: {ac}</strong>
              {cls.name === 'Bárbaro' && armor === 'Sin armadura' && ' (defensa sin armadura: Destreza + Constitución)'}
              {cls.name === 'Monje' && armor === 'Sin armadura' && ' (defensa sin armadura: Destreza + Sabiduría)'}
            </p>
          )}
        </div>
      )}

      {step === 8 && (
        <div>
          <h3>Así es tu personaje</h3>
          <div>
            {PERSONALITIES.map((p) => (
              <button
                type="button"
                key={p}
                className={`chip${personality === p ? ' chip-selected' : ''}`}
                onClick={() => setPersonality(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <h3>Lo que busca en el mundo</h3>
          <div>
            {MOTIVATIONS.map((m) => (
              <button
                type="button"
                key={m}
                className={`chip${motivation === m ? ' chip-selected' : ''}`}
                onClick={() => setMotivation(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 9 && cls && species && background && scores && (
        <div>
          <h3>Tu héroe está listo</h3>
          <div className="card">
            <p>
              <strong>{name.trim()}</strong> · {species.name} · {cls.name} · Nivel 1
            </p>
            <p>
              Trasfondo: {background.name} · {personality} · Busca: {motivation}
            </p>
            <p>
              {ABILITIES.map((a) => `${a} ${scores[a]} (${fmtMod(scores[a])})`).join(' · ')}
            </p>
            <p>
              Vida máxima: {maxHp} (d{cls.hitDie} {fmtMod(conScore)}) · Defensa: {ac} · Bono de
              competencia: +{proficiencyBonus(1)}
            </p>
            <p>
              Arma: {weapon} · Armadura: {armor}
              {shield ? ' · Con escudo' : ' · Sin escudo'} · Mochila: {pack}
            </p>
            <p>Se le da bien: {allSkills.join(', ')}</p>
          </div>
          <h4>¿Con cuánta vida empiezas?</h4>
          <div>
            {HP_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.id}
                className={`card${hpOption === opt.id ? ' card-selected' : ''}`}
                onClick={() => setHpOption(opt.id)}
              >
                <strong>{opt.label}</strong>
                <p>
                  {opt.id === 'completa'
                    ? `${maxHp} puntos`
                    : opt.id === 'mitad'
                      ? `${Math.max(1, Math.floor(maxHp / 2))} puntos`
                      : '1 punto'}
                </p>
                <p>{opt.desc}</p>
              </button>
            ))}
          </div>
          {error && <p>{error}</p>}
          <button
            type="button"
            className="btn btn-primary"
            disabled={!schemaOk || creating}
            onClick={handleCreate}
          >
            {creating ? 'Creando…' : '✨ Crear mi personaje'}
          </button>
        </div>
      )}

      <div>
        <button type="button" className="btn" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>
          ← Atrás
        </button>
        {step < 9 && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canNext()}
            onClick={() => setStep((s) => Math.min(9, s + 1))}
          >
            Siguiente →
          </button>
        )}
      </div>
    </div>
  );
}
