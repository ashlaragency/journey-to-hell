import { useState } from 'react';
import { supabase, type CharacterRow } from '../lib/supabase';
import { DEFAULT_APPEARANCE, HAIR_COLORS, HAIR_STYLES, readAppearance, writeAppearance, type CharacterAppearance } from '../lib/appearance';
import CharacterPortrait from './CharacterPortrait';
import './CharacterCreator.css';

interface AppearanceEditorProps {
  character: CharacterRow;
  onSaved: () => void;
  onCancel: () => void;
  schemaOk: boolean;
}

export default function AppearanceEditor({ character, onSaved, onCancel, schemaOk }: AppearanceEditorProps) {
  const [appearance, setAppearance] = useState<CharacterAppearance>(() => readAppearance(character.notes) ?? DEFAULT_APPEARANCE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  if (character.status !== 'vivo') {
    return <p className="hint">La hoja está sellada. La apariencia de un personaje caído queda como parte de su historia.</p>;
  }

  async function save() {
    if (!schemaOk || saving) return;
    setSaving(true);
    setError('');
    setSaved(false);
    const nextNotes = writeAppearance(character.notes, appearance);
    try {
      let query = supabase.from('characters').update({ notes: nextNotes }).eq('id', character.id).eq('status', 'vivo');
      query = character.notes === null ? query.is('notes', null) : query.eq('notes', character.notes);
      const { data, error: updateError } = await query.select('id').maybeSingle();
      if (updateError) throw updateError;
      if (!data) {
        setError('La hoja cambió en otra sesión. Actualiza la compañía y vuelve a intentarlo.');
        return;
      }
      setSaved(true);
      onSaved();
    } catch (caught) {
      setError(`No se pudo guardar la apariencia. ${caught instanceof Error ? caught.message : 'Revisa la conexión e inténtalo de nuevo.'}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="appearance-editor" aria-label={`Cambiar apariencia de ${character.name}`}>
      <div className="appearance-editor-preview">
        <CharacterPortrait
          species={character.species}
          profession={character.class_name}
          appearance={appearance}
          weapon={character.weapon}
          armor={character.armor}
          shield={character.shield}
          pack={character.pack}
          name={character.name}
        />
        <p>{character.species} · {character.class_name}</p>
      </div>
      <div className="appearance-editor-fields">
        <h3>Apariencia de {character.name}</h3>
        <fieldset className="appearance-choice-group">
          <legend>Peinado</legend>
          <div className="appearance-choice-row">
            {HAIR_STYLES.map((style) => (
              <button type="button" key={style.id} className={`appearance-choice${appearance.hairStyle === style.id ? ' is-selected' : ''}`} aria-pressed={appearance.hairStyle === style.id} onClick={() => { setAppearance((current) => ({ ...current, hairStyle: style.id })); setSaved(false); }}>
                <span className={`hair-swatch hair-${style.id}`} aria-hidden="true" />{style.label}
              </button>
            ))}
          </div>
        </fieldset>
        {appearance.hairStyle !== 'bald' && <fieldset className="appearance-choice-group">
          <legend>Color del cabello</legend>
          <div className="appearance-choice-row">
            {HAIR_COLORS.map((color) => (
              <button type="button" key={color.id} className={`appearance-choice color-choice${appearance.hairColor === color.id ? ' is-selected' : ''}`} aria-pressed={appearance.hairColor === color.id} onClick={() => { setAppearance((current) => ({ ...current, hairColor: color.id })); setSaved(false); }}>
                <span className={`color-swatch swatch-${color.id}`} aria-hidden="true" />{color.label}
              </button>
            ))}
          </div>
        </fieldset>}
        <div className="appearance-editor-actions">
          <button type="button" className="btn btn-primary" disabled={!schemaOk || saving} onClick={() => void save()}>{saving ? 'Guardando…' : 'Guardar apariencia'}</button>
          <button type="button" className="btn" disabled={saving} onClick={onCancel}>Cancelar</button>
        </div>
        <p className="appearance-editor-status" role={error ? 'alert' : 'status'}>{error || (saved ? 'Apariencia guardada.' : !schemaOk ? 'Conecta con el mundo para guardar los cambios.' : '')}</p>
      </div>
    </section>
  );
}
