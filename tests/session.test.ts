import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { describeWorldEvent, newerCue, parseSceneCue, SCENE_EVENT_TITLE } from '../src/lib/session.ts';

const payload = {
  type: 'jth.scene.v1', adventureId: 'adventure-a', sceneIndex: 1,
  place: 'La puerta', narration: 'Una luz se filtra bajo la puerta.', director: 'Ariadna', active: true,
};
const event = (changes = {}) => ({
  id: 'event-a', world_id: 'world-a', kind: 'evento' as const, title: SCENE_EVENT_TITLE,
  body: JSON.stringify(payload), created_at: '2026-11-12T12:00:00.000Z', ...changes,
});

describe('Escenas compartidas de una mesa', () => {
  it('recupera el lugar y el estado de dirección después de recargar', () => {
    assert.deepEqual(parseSceneCue(event())?.payload, payload);
  });
  it('conserva los eventos antiguos que aún no incluían active', () => {
    const { active: _active, ...original } = payload;
    assert.equal(parseSceneCue(event({ body: JSON.stringify(original) }))?.payload.active, true);
  });
  it('libera el recorrido sin borrar la historia anterior', () => {
    const row = event({ body: JSON.stringify({ ...payload, active: false }) });
    assert.equal(parseSceneCue(row)?.payload.active, false);
    assert.match(describeWorldEvent(row), /deja el recorrido libre/);
  });
  it('ignora otros acontecimientos y datos dañados', () => {
    for (const row of [null, {}, event({ title: 'Un rumor' }), event({ kind: 'rumor' }), event({ body: '{' }), event({ created_at: 'ayer' })]) {
      assert.equal(parseSceneCue(row), null);
    }
  });
  it('rechaza escenas con índices y textos inválidos antes de usarlos en la interfaz', () => {
    for (const change of [{ sceneIndex: -1 }, { sceneIndex: 1.5 }, { sceneIndex: 1000 }, { adventureId: '' }, { director: ' ' }, { narration: 'a'.repeat(20001) }, { active: 'true' }]) {
      assert.equal(parseSceneCue(event({ body: JSON.stringify({ ...payload, ...change }) })), null);
    }
  });
  it('no reemplaza una escena Realtime nueva por una consulta antigua que termina después', () => {
    const older = parseSceneCue(event())!;
    const latest = parseSceneCue(event({ id: 'event-b', created_at: '2026-11-12T12:01:00Z' }))!;
    assert.equal(newerCue(latest, older), latest);
    assert.equal(newerCue(older, latest), latest);
    assert.equal(newerCue(latest, latest), latest);
  });
  it('desempata fechas iguales de forma consistente en ambas sesiones', () => {
    const a = parseSceneCue(event())!;
    const b = parseSceneCue(event({ id: 'event-b' }))!;
    assert.equal(newerCue(a, b), b);
    assert.equal(newerCue(b, a), b);
  });
  it('muestra narrativa legible en la crónica, incluso ante un evento de escena dañado', () => {
    assert.match(describeWorldEvent(event()), /Ariadna conduce al grupo a La puerta/);
    assert.doesNotMatch(describeWorldEvent(event()), /jth.scene|adventureId/);
    assert.match(describeWorldEvent(event({ body: '{' })), /no se pudo leer/);
    assert.equal(describeWorldEvent(event({ title: 'Rumor', body: 'Una campana suena.' })), 'Una campana suena.');
  });
});
