// Atlas de exploración de «Journey to Hell» (Calvaria, 312 d.S.).
// 9 zonas, 34 lugares, 43 mapas. La navegación sigue solo las conexiones
// del atlas: ruta del descenso, travesías, entradas menores y accesos
// especiales. Los lugares 13, 14 y 15 no tienen imagen y se muestran así.
import { useState } from 'react';
import {
  LUGARES,
  ZONAS,
  RUTA_DEL_DESCENSO,
  TRAVESIAS,
  ENTRADAS_MENORES,
  ACCESOS_ESPECIALES,
  GARGANTA_NUEVE_DIAS,
  lugarPorId,
  urlMapa,
  posicionEnDescenso,
  anteriorEnDescenso,
  siguienteEnDescenso,
  travesiasDeLugar,
  entradasDesdeLugar,
  accesoEspecialDeLugar,
  type MapaAtlas,
} from '../lib/atlas';

interface AtlasProps {
  onAbrirMapa: (mapa: MapaAtlas) => void;
}

const TIPO_LABEL: Record<string, string> = {
  exterior: 'Exterior',
  interior: 'Interior',
  'exterior+interior': 'Exterior e interior',
};

export default function Atlas({ onAbrirMapa }: AtlasProps) {
  const [zonaFiltro, setZonaFiltro] = useState<string>('Todas');
  const [lugarId, setLugarId] = useState<string>('lugar-1');
  const [verGarganta, setVerGarganta] = useState(false);

  const lugar = lugarPorId(lugarId) ?? LUGARES[0];
  const lugaresFiltrados =
    zonaFiltro === 'Todas' ? LUGARES : LUGARES.filter((l) => l.zona === zonaFiltro);
  const posDescenso = posicionEnDescenso(lugar.id);
  const anterior = anteriorEnDescenso(lugar.id);
  const siguiente = siguienteEnDescenso(lugar.id);
  const travesias = travesiasDeLugar(lugar.id);
  const entradas = entradasDesdeLugar(lugar.id);
  const acceso = accesoEspecialDeLugar(lugar.id);

  function irA(id: string) {
    setLugarId(id);
    const l = lugarPorId(id);
    if (l) setZonaFiltro('Todas');
  }

  return (
    <div>
      <div className="card">
        <h2>🗺️ Atlas de exploración</h2>
        <p className="hint">
          Calvaria, 312 después de la Sima · 9 zonas · 34 lugares · 43 mapas
          cenitales 16:9. Tres mares (Mar de Hierro, Mar de las Lámparas y
          Océano Pálido) no tienen imagen en el inventario y se muestran sin
          mapa, tal como dice el atlas.
        </p>

        <h3>Ruta del descenso</h3>
        <p className="hint">15 paradas, de Lumen Alta al Fondo. Toca una parada para ver su ficha.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
          {RUTA_DEL_DESCENSO.map((id, i) => {
            const l = lugarPorId(id);
            if (!l) return null;
            return (
              <span key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  type="button"
                  className={id === lugar.id ? 'chip chip-selected' : 'chip'}
                  onClick={() => irA(id)}
                >
                  {i + 1}. {l.nombre}
                </button>
                {i < RUTA_DEL_DESCENSO.length - 1 && <span aria-hidden="true">→</span>}
              </span>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3>Lugares por zona</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
          <button
            type="button"
            className={zonaFiltro === 'Todas' ? 'chip chip-selected' : 'chip'}
            onClick={() => setZonaFiltro('Todas')}
          >
            Todas ({LUGARES.length})
          </button>
          {ZONAS.map((z) => (
            <button
              key={z.nombre}
              type="button"
              className={zonaFiltro === z.nombre ? 'chip chip-selected' : 'chip'}
              onClick={() => setZonaFiltro(z.nombre)}
            >
              {z.nombre} ({z.lugares.length})
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {lugaresFiltrados.map((l) => (
            <button
              key={l.id}
              type="button"
              className={l.id === lugar.id ? 'chip chip-selected' : 'chip'}
              onClick={() => setLugarId(l.id)}
            >
              {l.nombre}
              {l.mapas.length === 0 ? ' · sin imagen' : ` · ${l.mapas.length} mapa${l.mapas.length === 1 ? '' : 's'}`}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>
          {lugar.nombre}
          {posDescenso >= 0 && (
            <span className="hint"> · Parada {posDescenso + 1} de 15 en la ruta del descenso</span>
          )}
        </h2>
        <p className="hint">
          {lugar.zona} · {TIPO_LABEL[lugar.tipo] ?? lugar.tipo}
        </p>

        {lugar.mapas.length === 0 ? (
          <p>
            ⚠️ Sin imagen en el inventario de 43 mapas. Este lugar se muestra
            sin mapa, tal como lo marca el atlas.
          </p>
        ) : (
          <div>
            <p className="hint">
              Mapas del atlas: {lugar.mapasAtlas}. Toca un mapa para abrirlo en
              el Mapa de batalla.
            </p>
            <div className="grid-cards">
              {lugar.mapas.map((m) => (
                <button
                  key={m.slug}
                  type="button"
                  className="card"
                  style={{ padding: '0.5rem', textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => onAbrirMapa(m)}
                >
                  <img
                    src={urlMapa(m.slug)}
                    alt={`Mapa de ${m.nombre}`}
                    style={{ width: '100%', borderRadius: '6px', display: 'block' }}
                  />
                  <p style={{ margin: '0.5rem 0 0' }}>
                    <strong>{m.nombre}</strong>
                    <br />
                    <span className="hint">Abrir en el Mapa de batalla →</span>
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <dl>
          <dt>Recorrido</dt>
          <dd>{lugar.recorrido}</dd>
          <dt>Decisión en mesa</dt>
          <dd>{lugar.decision}</dd>
          <dt>Cartografía pendiente</dt>
          <dd>{lugar.cartografiaPendiente}</dd>
        </dl>

        <h3>Entradas y salidas</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {anterior && (
            <button type="button" className="btn" onClick={() => irA(anterior)}>
              ← Anterior: {lugarPorId(anterior)?.nombre}
            </button>
          )}
          {siguiente && (
            <button type="button" className="btn" onClick={() => irA(siguiente)}>
              Siguiente: {lugarPorId(siguiente)?.nombre} →
            </button>
          )}
          {posDescenso < 0 && (
            <span className="hint">Este lugar no está en la ruta del descenso.</span>
          )}
        </div>

        {travesias.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <p>
              <strong>Travesías y ramales que pasan por aquí:</strong>
            </p>
            {travesias.map((t) => (
              <p key={t.nombre} style={{ margin: '0.3rem 0' }}>
                {t.paradas.map((pid, i) => {
                  const pl = lugarPorId(pid);
                  if (!pl) return null;
                  return (
                    <span key={pid}>
                      <button
                        type="button"
                        className="chip"
                        onClick={() => irA(pid)}
                        style={pid === lugar.id ? { fontWeight: 'bold' } : undefined}
                      >
                        {pl.nombre}
                      </button>
                      {i < t.paradas.length - 1 && <span aria-hidden="true"> → </span>}
                    </span>
                  );
                })}
              </p>
            ))}
          </div>
        )}

        {entradas.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <p>
              <strong>Entradas menores desde aquí:</strong>
            </p>
            {entradas.map((e) => (
              <p key={e.nombre} style={{ margin: '0.3rem 0' }}>
                {e.nombre} —{' '}
                {e.destinoAbierto ? (
                  <span className="hint">{e.nota}</span>
                ) : (
                  <>
                    lleva a{' '}
                    {e.destinos.map((d, i) => (
                      <span key={d}>
                        <button type="button" className="chip" onClick={() => irA(d)}>
                          {lugarPorId(d)?.nombre ?? d}
                        </button>
                        {i < e.destinos.length - 1 && ' y '}
                      </span>
                    ))}
                  </>
                )}
              </p>
            ))}
          </div>
        )}

        {acceso && (
          <p style={{ marginTop: '0.75rem' }}>
            <strong>Acceso especial:</strong> {acceso.acceso}
          </p>
        )}
      </div>

      <div className="card">
        <h3>Travesías y ramales</h3>
        {TRAVESIAS.map((t) => (
          <p key={t.nombre} style={{ margin: '0.3rem 0' }}>
            {t.paradas.map((pid, i) => {
              const pl = lugarPorId(pid);
              if (!pl) return null;
              return (
                <span key={pid}>
                  <button type="button" className="chip" onClick={() => irA(pid)}>
                    {pl.nombre}
                  </button>
                  {i < t.paradas.length - 1 && <span aria-hidden="true"> → </span>}
                </span>
              );
            })}
          </p>
        ))}
        <h3>Entradas menores</h3>
        {ENTRADAS_MENORES.map((e) => (
          <p key={e.nombre} style={{ margin: '0.3rem 0' }}>
            <button type="button" className="chip" onClick={() => irA(e.desde)}>
              {lugarPorId(e.desde)?.nombre ?? e.desde}
            </button>{' '}
            · {e.nombre} —{' '}
            {e.destinoAbierto ? (
              <span className="hint">{e.nota}</span>
            ) : (
              <>
                lleva a{' '}
                {e.destinos.map((d, i) => (
                  <span key={d}>
                    <button type="button" className="chip" onClick={() => irA(d)}>
                      {lugarPorId(d)?.nombre ?? d}
                    </button>
                    {i < e.destinos.length - 1 && ' y '}
                  </span>
                ))}
              </>
            )}
          </p>
        ))}
        <h3>Accesos especiales</h3>
        {ACCESOS_ESPECIALES.map((a) => (
          <p key={a.lugar} style={{ margin: '0.3rem 0' }}>
            <button type="button" className="chip" onClick={() => irA(a.lugar)}>
              {lugarPorId(a.lugar)?.nombre ?? a.lugar}
            </button>{' '}
            · {a.acceso}
          </p>
        ))}
      </div>

      <div className="card">
        <h3>La Garganta en nueve días</h3>
        <p className="hint">
          Itinerario del atlas para convertir los nueve días canónicos en
          tramos jugables.
        </p>
        <button type="button" className="btn" onClick={() => setVerGarganta((v) => !v)}>
          {verGarganta ? 'Ocultar itinerario' : 'Ver los 9 días'}
        </button>
        {verGarganta && (
          <ol>
            {GARGANTA_NUEVE_DIAS.map((d) => (
              <li key={d.dia}>
                <strong>
                  Día {d.dia}: {d.titulo}.
                </strong>{' '}
                {d.texto}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
