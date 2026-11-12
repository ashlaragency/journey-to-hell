// Atlas de exploración de «Journey to Hell» (Calvaria, 312 d.S.).
// Datos copiados tal cual del atlas original
// (~/workspace/user/files/Journey_to_Hell_-_Atlas_de_exploracion.html):
// 9 zonas, 34 fichas, ruta del descenso, travesías, entradas menores,
// accesos especiales e itinerario de la Garganta en 9 días.
// Los mapas viven en /maps/<slug>.webp (43 archivos, 16:9, cenitales).
// Los lugares 13, 14 y 15 (Mar de Hierro, Mar de las Lámparas, Océano
// Pálido) NO tienen imagen: su lista de mapas queda vacía a propósito.

export type TipoLugar = 'exterior' | 'interior' | 'exterior+interior';

export interface MapaAtlas {
  slug: string; // sin extensión; la imagen vive en /maps/<slug>.webp
  nombre: string;
}

export interface LugarAtlas {
  id: string; // lugar-1..lugar-34
  nombre: string;
  zona: string;
  tipo: TipoLugar;
  mapas: MapaAtlas[];
  /** Texto tal cual del atlas, campo «Mapas de Muse». */
  mapasAtlas: string;
  recorrido: string;
  decision: string;
  cartografiaPendiente: string;
}

export interface ZonaAtlas {
  nombre: string;
  lugares: string[]; // ids lugar-N en orden del atlas
}

export const ZONAS: ZonaAtlas[] = [
  { nombre: 'Solencia', lugares: ['lugar-1', 'lugar-2', 'lugar-3', 'lugar-4', 'lugar-5', 'lugar-6', 'lugar-7', 'lugar-8'] },
  { nombre: 'Skarn', lugares: ['lugar-9'] },
  { nombre: 'Qasreth', lugares: ['lugar-10', 'lugar-11'] },
  { nombre: 'Ignara', lugares: ['lugar-12'] },
  { nombre: 'Mares', lugares: ['lugar-13', 'lugar-14', 'lugar-15', 'lugar-16'] },
  { nombre: 'Descenso', lugares: ['lugar-17', 'lugar-18', 'lugar-19'] },
  { nombre: 'Planos', lugares: ['lugar-20', 'lugar-21', 'lugar-22', 'lugar-23'] },
  { nombre: 'Nadir', lugares: ['lugar-24', 'lugar-25', 'lugar-26', 'lugar-27', 'lugar-28', 'lugar-29', 'lugar-30'] },
  { nombre: 'Interiores reutilizables', lugares: ['lugar-31', 'lugar-32', 'lugar-33', 'lugar-34'] },
];

export const LUGARES: LugarAtlas[] = [
  {
    id: 'lugar-1',
    nombre: 'Lumen Alta',
    zona: 'Solencia',
    tipo: 'exterior',
    mapas: [
      { slug: 'catedral-mediodia', nombre: 'Catedral del Mediodía' },
      { slug: 'taberna-lumen-alta', nombre: 'Taberna de Lumen Alta' },
      { slug: 'plaza-lumen-alta', nombre: 'Plaza de las escalinatas' },
    ],
    mapasAtlas: 'Catedral del Mediodía, taberna, plaza de las escalinatas',
    recorrido: 'Catedral → plaza → Puerta de las Campanas → calzada. La taberna conecta con la plaza por un patio de servicio.',
    decision: 'La marca del sol abre el paso ceremonial. Un salvoconducto de Dornvald ofrece otra vía.',
    cartografiaPendiente: 'Sacristía de la Catedral y archivo de la Cruzada Honda.',
  },
  {
    id: 'lugar-2',
    nombre: 'Camino de las Campanas',
    zona: 'Solencia',
    tipo: 'exterior',
    mapas: [{ slug: 'camino-campanas', nombre: 'Camino de las Campanas' }],
    mapasAtlas: 'Camino de las Campanas',
    recorrido: 'Calzada de 300 leguas, una torre por legua. La ruta atraviesa La Cicatriz antes de Bastión Último.',
    decision: 'Si una campana suena sin viento, subir a la torre permite ver qué se aproxima antes de seguir.',
    cartografiaPendiente: 'Torre en corte y puesto de relevo con establo.',
  },
  {
    id: 'lugar-3',
    nombre: 'La Cicatriz',
    zona: 'Solencia',
    tipo: 'exterior',
    mapas: [{ slug: 'cicatriz', nombre: 'La Cicatriz' }],
    mapasAtlas: 'La Cicatriz',
    recorrido: 'Anillo de 300 km. Calzada elevada → aldea hundida → bosque petrificado → puesto exterior de Bastión.',
    decision: 'Los ríos invertidos cortan la calzada. Se puede cruzar por el puente vigilado o bajar por los cimientos expuestos de la aldea.',
    cartografiaPendiente: 'Aldea hundida con casas comunicadas por tejados y un sótano inundable.',
  },
  {
    id: 'lugar-4',
    nombre: 'Bastión Último',
    zona: 'Solencia',
    tipo: 'exterior+interior',
    mapas: [
      { slug: 'bastion-ultimo', nombre: 'Patio de Bastión Último' },
      { slug: 'taberna-bastion', nombre: 'Taberna militar' },
    ],
    mapasAtlas: 'Patio de Bastión Último, taberna militar',
    recorrido: 'Puerta de tierra → patio → muralla interior → torno de descenso. Desde el patio se llega a la taberna.',
    decision: 'La orden controla el torno. La galería de mantenimiento evita el control a cambio de descender junto a la cascada.',
    cartografiaPendiente: 'Torno, barracones y galería bajo la muralla.',
  },
  {
    id: 'lugar-5',
    nombre: 'Llanos de Veyra',
    zona: 'Solencia',
    tipo: 'exterior+interior',
    mapas: [
      { slug: 'llanos-veyra', nombre: 'Llanos' },
      { slug: 'granero-molino-veyra', nombre: 'Granero con molino' },
    ],
    mapasAtlas: 'Llanos, granero con molino',
    recorrido: 'Camino de Aurel → dique → granero → molino. Canal de carga hacia Caldemar.',
    decision: 'La compuerta decide qué parcela se inunda. Desviar el agua deja transitable el canal y expone el granero.',
    cartografiaPendiente: 'Aldea del dique y esclusa con compuerta accionable.',
  },
  {
    id: 'lugar-6',
    nombre: 'Caldemar',
    zona: 'Solencia',
    tipo: 'exterior+interior',
    mapas: [
      { slug: 'muelles-caldemar', nombre: 'Muelles' },
      { slug: 'logia-caldemar', nombre: 'Logia' },
    ],
    mapasAtlas: 'Muelles, logia',
    recorrido: 'Faro → muelles → aduana → logia de las doce casas. Rutas marítimas hacia Skarn, Qasreth e Ignara.',
    decision: 'El manifiesto de carga revela el contrabando de brasa. Presentarlo abre la aduana y compromete el acceso de los contrabandistas.',
    cartografiaPendiente: 'Faro, almacén de brasa y aduana.',
  },
  {
    id: 'lugar-7',
    nombre: 'Brunnak',
    zona: 'Solencia',
    tipo: 'exterior+interior',
    mapas: [
      { slug: 'salon-brunnak', nombre: 'Salón de Brunnak' },
      { slug: 'minas-brunnak', nombre: 'Minas selladas' },
    ],
    mapasAtlas: 'Salón de Brunnak, minas selladas',
    recorrido: 'Paso del Espinazo → salón gremial → minas selladas. En la bifurcación profunda, un ramal roza Cinerea y otro alcanza el Páramo de los Colosos.',
    decision: 'Antes de abrir el sello, elegir entre asegurar el retorno con un cabrestante o desmontar la maquinaria para liberar a los obreros.',
    cartografiaPendiente: 'Galerías profundas y bifurcación hacia el Nadir y el Páramo.',
  },
  {
    id: 'lugar-8',
    nombre: 'Sylmora',
    zona: 'Solencia',
    tipo: 'exterior+interior',
    mapas: [
      { slug: 'bosque-sylmora', nombre: 'Bosque' },
      { slug: 'sala-faroles-sylmora', nombre: 'Sala de faroles' },
    ],
    mapasAtlas: 'Bosque, sala de faroles',
    recorrido: 'Sendero de la costa → puente de raíz → sala de faroles. El embarcadero comunica con la niebla del Mar Ciego.',
    decision: 'Las pavesas cautivas guían por el bosque. Apagar los faroles oculta la marcha y corta la orientación del regreso.',
    cartografiaPendiente: 'Embarcadero, vivero de faroles y puente de raíz.',
  },
  {
    id: 'lugar-9',
    nombre: 'Hrimgard',
    zona: 'Skarn',
    tipo: 'exterior+interior',
    mapas: [
      { slug: 'fiordo-hrimgard', nombre: 'Fiordo' },
      { slug: 'salon-hrimgard', nombre: 'Salón de Hrimgard' },
    ],
    mapasAtlas: 'Fiordo, salón de Hrimgard',
    recorrido: 'Mar de Hierro → playa de basalto → escalera de costillas → salón tallado en el acantilado.',
    decision: 'Con marea alta se pierde la playa. La escalera y la cornisa del salón siguen comunicadas.',
    cartografiaPendiente: 'Embarcadero de los clanes y nivel superior del salón.',
  },
  {
    id: 'lugar-10',
    nombre: 'Sehet-Amar',
    zona: 'Qasreth',
    tipo: 'exterior+interior',
    mapas: [
      { slug: 'templo-sehet-amar', nombre: 'Templo' },
      { slug: 'pozos-sehet-amar', nombre: 'Pozos de contrato' },
    ],
    mapasAtlas: 'Templo, pozos de contrato',
    recorrido: 'Mar de las Lámparas → avenida de estatuas → templo funerario → pozos de contrato.',
    decision: 'Cada pozo exige un sello funerario y registra quién cruza. La vía seca permite investigar los contratos sin firmarlos.',
    cartografiaPendiente: 'Avenida de estatuas, archivo funerario y cámara bajo los pozos.',
  },
  {
    id: 'lugar-11',
    nombre: 'Salar de los Sin Sombra',
    zona: 'Qasreth',
    tipo: 'exterior',
    mapas: [{ slug: 'salares-qasreth', nombre: 'Salares de Qasreth' }],
    mapasAtlas: 'Salares de Qasreth',
    recorrido: 'Sehet-Amar → cauce seco → mesetas rojas → campamento móvil. Los guías conocen rutas hacia entradas menores.',
    decision: 'La caravana cambia de lugar al amanecer. La sombra de los obeliscos marca el cauce que conserva agua.',
    cartografiaPendiente: 'Campamento móvil, aljibe y paso entre mesetas.',
  },
  {
    id: 'lugar-12',
    nombre: 'Archipiélago de Ignara',
    zona: 'Ignara',
    tipo: 'exterior+interior',
    mapas: [
      { slug: 'ladera-volcanica-ignara', nombre: 'Ladera volcánica' },
      { slug: 'templo-forja-ignara', nombre: 'Templo-forja' },
      { slug: 'crater-ignara', nombre: 'Cráter mayor' },
    ],
    mapasAtlas: 'Ladera volcánica, templo-forja, cráter mayor',
    recorrido: 'Puerto de arena negra → ladera → forja → escalera del cráter. El archipiélago tiene cuarenta islas volcánicas.',
    decision: 'Cruzar los estrechos con marea favorable. El paso del cráter requiere un retorno asegurado antes de bajar.',
    cartografiaPendiente: 'Carta del archipiélago, puerto y cámaras bajo el cráter.',
  },
  {
    id: 'lugar-13',
    nombre: 'Mar de Hierro',
    zona: 'Mares',
    tipo: 'exterior',
    mapas: [],
    mapasAtlas: 'Sin imagen en el inventario de 43 mapas.',
    recorrido: 'Caldemar → escala septentrional de Solencia → fiordo de Hrimgard.',
    decision: 'Los témpanos cierran el canal rápido. La ruta pegada al basalto ofrece desembarcos y alarga la travesía.',
    cartografiaPendiente: 'Carta de navegación y cubierta entre témpanos.',
  },
  {
    id: 'lugar-14',
    nombre: 'Mar de las Lámparas',
    zona: 'Mares',
    tipo: 'exterior',
    mapas: [],
    mapasAtlas: 'Sin imagen en el inventario de 43 mapas.',
    recorrido: 'Caldemar → canal bioluminiscente → costa de Qasreth.',
    decision: 'La estela luminosa delata a los barcos de noche. Navegar a vela corta la estela y reduce la maniobra.',
    cartografiaPendiente: 'Carta de bajos y travesía nocturna.',
  },
  {
    id: 'lugar-15',
    nombre: 'Océano Pálido',
    zona: 'Mares',
    tipo: 'exterior',
    mapas: [],
    mapasAtlas: 'Sin imagen en el inventario de 43 mapas.',
    recorrido: 'Costas occidentales de Solencia → arco de Ignara → aguas cenicientas del oeste.',
    decision: 'La ceniza oculta arrecifes y ahoga luces. Tomar sondas desde un bote expone al equipo de avanzada.',
    cartografiaPendiente: 'Carta de arrecifes, estrechos y fondeaderos de Ignara.',
  },
  {
    id: 'lugar-16',
    nombre: 'Mar Ciego',
    zona: 'Mares',
    tipo: 'exterior',
    mapas: [{ slug: 'remolino-mar-ciego', nombre: 'Remolino del Mar Ciego' }],
    mapasAtlas: 'Remolino del Mar Ciego',
    recorrido: 'Sylmora → embarcadero oriental → niebla → remolino. Las pavesas de ahogados quedan bajo la niebla.',
    decision: 'Amarrar dos embarcaciones conserva una ruta de rescate. Seguir las luces bajo el agua arrastra la nave hacia el remolino.',
    cartografiaPendiente: 'Carta de acceso y trayecto tras el remolino.',
  },
  {
    id: 'lugar-17',
    nombre: 'La Sima',
    zona: 'Descenso',
    tipo: 'exterior',
    mapas: [{ slug: 'sima', nombre: 'Cornisa de La Sima' }],
    mapasAtlas: 'Cornisa de La Sima',
    recorrido: 'Bastión Último → torno o galería → cornisa → Escalera de los Trescientos Años.',
    decision: 'El abismo mide 40 km de ancho. Los cruces bajo las cataratas se abren al bajar el caudal.',
    cartografiaPendiente: 'Perfil del abismo con cotas, descansos y rutas de rescate.',
  },
  {
    id: 'lugar-18',
    nombre: 'La Garganta',
    zona: 'Descenso',
    tipo: 'exterior+interior',
    mapas: [
      { slug: 'garganta', nombre: 'Pueblo colgado' },
      { slug: 'cabana-garganta', nombre: 'Cabaña colgada' },
    ],
    mapasAtlas: 'Pueblo colgado, cabaña colgada',
    recorrido: 'Nueve días de descenso por la escalera. Andamios, puentes de cuerda y elevadores conectan aldeas.',
    decision: 'Cada elevador tiene un contrapeso en un nivel distinto. Una avería obliga a escoger entre reparar y perder un día o rodear por la roca.',
    cartografiaPendiente: 'Nueve etapas, talleres de contrapesos, refugios y nidos.',
  },
  {
    id: 'lugar-19',
    nombre: 'Puerta de Hueso',
    zona: 'Descenso',
    tipo: 'exterior',
    mapas: [{ slug: 'puerta-hueso', nombre: 'Puerta de Hueso' }],
    mapasAtlas: 'Puerta de Hueso',
    recorrido: 'Fin de la roca mortal → arco de costillas → muelle del Pavesal.',
    decision: 'La bruma oculta la orilla después del arco. Marcar el camino permite volver si el embarque falla.',
    cartografiaPendiente: 'Pasadizo entre arco y muelle, con refugio de espera.',
  },
  {
    id: 'lugar-20',
    nombre: 'El Pavesal',
    zona: 'Planos',
    tipo: 'exterior',
    mapas: [{ slug: 'pavesal', nombre: 'Orilla del Pavesal' }],
    mapasAtlas: 'Orilla del Pavesal',
    recorrido: 'Puerta de Hueso → lago negro → barcaza → desembarco de Cinerea.',
    decision: 'El tránsito principal hacia el Nadir exige cruzar el lago. Las redes de hierro permiten subir a una barcaza cuando atraca.',
    cartografiaPendiente: 'Cubierta de barcaza, puesto de cobro y ambas orillas.',
  },
  {
    id: 'lugar-21',
    nombre: 'El Sopor',
    zona: 'Planos',
    tipo: 'exterior',
    mapas: [{ slug: 'sopor', nombre: 'Isla flotante de recuerdos' }],
    mapasAtlas: 'Isla flotante de recuerdos',
    recorrido: 'Entrada por el sueño → isla de recuerdos → escaleras → ancla de despertar.',
    decision: 'Definir el ancla antes de dormir. Moverla durante el sueño cambia el punto de retorno.',
    cartografiaPendiente: 'Tres islas conectadas y plano de escaleras reversibles.',
  },
  {
    id: 'lugar-22',
    nombre: 'El Empíreo',
    zona: 'Planos',
    tipo: 'exterior',
    mapas: [{ slug: 'empireo', nombre: 'Ciudad de mármol vacía' }],
    mapasAtlas: 'Ciudad de mármol vacía',
    recorrido: 'Grieta del Sello → ciudad de mármol → columnata → puertas encadenadas por dentro.',
    decision: 'Una cadena abierta permite alcanzar los tronos. Desde el exterior se puede rodear por una cornisa expuesta.',
    cartografiaPendiente: 'Acceso por el Sello, columnata y cámara de las cadenas.',
  },
  {
    id: 'lugar-23',
    nombre: 'Páramo de los Colosos',
    zona: 'Planos',
    tipo: 'exterior',
    mapas: [{ slug: 'paramo-colosos', nombre: 'Andamios del dios muerto' }],
    mapasAtlas: 'Andamios del dios muerto',
    recorrido: 'Túneles hondos de Brunnak → andamios → campamento minero → galería sobre el coloso.',
    decision: 'El cuerpo deriva y separa las plataformas. Reservar una cuerda al acceso permite volver cuando el puente ya no coincide.',
    cartografiaPendiente: 'Campamento y mina del coloso, con andamios a distinta altura.',
  },
  {
    id: 'lugar-24',
    nombre: 'Cinerea',
    zona: 'Nadir',
    tipo: 'exterior',
    mapas: [{ slug: 'cinerea', nombre: 'Aduana de Cinerea' }],
    mapasAtlas: 'Aduana de Cinerea',
    recorrido: 'Pavesal → garita → patio de pesaje → archivo → camino a Ferralia.',
    decision: 'Mordrath el Recaudador controla el paso. Cambiar el registro abre la salida pero pone a los sabuesos sobre el grupo.',
    cartografiaPendiente: 'Archivo encadenado y ruinas soterradas.',
  },
  {
    id: 'lugar-25',
    nombre: 'Ferralia',
    zona: 'Nadir',
    tipo: 'exterior',
    mapas: [{ slug: 'ferralia', nombre: 'Fundición de Ferralia' }],
    mapasAtlas: 'Fundición de Ferralia',
    recorrido: 'Camino de Cinerea → horno → puente-grúa → rampa de carga hacia Sanguinar.',
    decision: 'Vulkara domina los hornos. Parar la grúa deja cruzar el metal, libera a un obrero y alerta a la guardia.',
    cartografiaPendiente: 'Sala de mandos, horno y muelle de embarque.',
  },
  {
    id: 'lugar-26',
    nombre: 'Sanguinar',
    zona: 'Nadir',
    tipo: 'exterior',
    mapas: [{ slug: 'sanguinar', nombre: 'Cubierta de barco de hueso' }],
    mapasAtlas: 'Cubierta de barco de hueso',
    recorrido: 'Muelle de Ferralia → cubierta → arrecife de coral → faro → embarcadero de Putrea.',
    decision: 'Karvos domina la flota. Encender el faro evita el arrecife y revela la posición de la nave.',
    cartografiaPendiente: 'Bodega, camarote del almirante y faro de calaveras.',
  },
  {
    id: 'lugar-27',
    nombre: 'Putrea',
    zona: 'Nadir',
    tipo: 'exterior',
    mapas: [{ slug: 'putrea', nombre: 'Selva de hongos y pantano' }],
    mapasAtlas: 'Selva de hongos y pantano',
    recorrido: 'Embarcadero → puente de raíz → templo invadido → salida hacia Gelidor.',
    decision: 'Nhygga controla el jardín. Cortar el micelio despeja la salida y libera una nube que delata el camino.',
    cartografiaPendiente: 'Templo con cámaras invadidas y drenaje del pantano.',
  },
  {
    id: 'lugar-28',
    nombre: 'Gelidor',
    zona: 'Nadir',
    tipo: 'exterior',
    mapas: [{ slug: 'gelidor', nombre: 'Lago de hielo negro' }],
    mapasAtlas: 'Lago de hielo negro',
    recorrido: 'Orilla de Putrea → lago → catedral de hielo → salón de espejos → aurífero umbral de Aurifex.',
    decision: 'Isenvar vigila el hielo. Las grietas visibles reflejan la ruta segura y pueden ocultarse bajo nieve reciente.',
    cartografiaPendiente: 'Catedral, salón de espejos y cámara bajo el hielo.',
  },
  {
    id: 'lugar-29',
    nombre: 'Aurifex',
    zona: 'Nadir',
    tipo: 'exterior',
    mapas: [{ slug: 'aurifex', nombre: 'Salón del palacio de Aurifex' }],
    mapasAtlas: 'Salón del palacio de Aurifex',
    recorrido: 'Umbral de Gelidor → canal de vino → banco → teatro → palacio → escalera al Fondo.',
    decision: 'Seraphine Vael exige una invitación. El registro del banco permite atravesar las dependencias de servicio.',
    cartografiaPendiente: 'Banco, teatro, canal y escalera de la nobleza.',
  },
  {
    id: 'lugar-30',
    nombre: 'El Fondo',
    zona: 'Nadir',
    tipo: 'exterior',
    mapas: [{ slug: 'trono-vacio', nombre: 'El Trono Vacío' }],
    mapasAtlas: 'El Trono Vacío',
    recorrido: 'Escalera de Aurifex → umbral del Custodio → caverna → base del Trono. El haz cae por el Eje.',
    decision: 'El Custodio guarda el acceso. Preparar rutas de repliegue y un lugar para parlamentar antes de pisar el haz.',
    cartografiaPendiente: 'Corte de la caverna y rutas hasta la base y el asiento.',
  },
  {
    id: 'lugar-31',
    nombre: 'Cabaña pequeña',
    zona: 'Interiores reutilizables',
    tipo: 'interior',
    mapas: [{ slug: 'cabana-pequena', nombre: 'Cabaña pequeña' }],
    mapasAtlas: 'Cabaña pequeña',
    recorrido: 'Puerta → estancia → cama y estufa. Ventana practicable al exterior.',
    decision: 'Ubicar la ventana en el muro visible desde el mapa de la aldea.',
    cartografiaPendiente: 'Variantes de puerta, ventanas y trampilla cuando el exterior las muestre.',
  },
  {
    id: 'lugar-32',
    nombre: 'Cabaña grande',
    zona: 'Interiores reutilizables',
    tipo: 'interior',
    mapas: [{ slug: 'cabana-grande', nombre: 'Cabaña grande' }],
    mapasAtlas: 'Cabaña grande',
    recorrido: 'Porche → sala común → dos dormitorios y cocina.',
    decision: 'La chimenea sirve de referencia para alinear la planta con la cubierta.',
    cartografiaPendiente: 'Variante de dos plantas con escalera y desembarco coincidentes.',
  },
  {
    id: 'lugar-33',
    nombre: 'Templo',
    zona: 'Interiores reutilizables',
    tipo: 'interior',
    mapas: [{ slug: 'templo-generico', nombre: 'Templo genérico' }],
    mapasAtlas: 'Templo genérico',
    recorrido: 'Pórtico → nave → altar, capillas laterales y sacristía.',
    decision: 'Asignar un acceso secundario según la fachada del templo concreto.',
    cartografiaPendiente: 'Cripta cuando haya escalera o trampilla visible.',
  },
  {
    id: 'lugar-34',
    nombre: 'Taberna',
    zona: 'Interiores reutilizables',
    tipo: 'interior',
    mapas: [{ slug: 'taberna-generica', nombre: 'Taberna genérica' }],
    mapasAtlas: 'Taberna genérica',
    recorrido: 'Entrada → sala y barra → cocina → patio. La escalera lleva a habitaciones.',
    decision: 'Mantener una salida de servicio si aparece en el exterior.',
    cartografiaPendiente: 'Planta alta y bodega con las mismas escaleras que en planta baja.',
  },
];

/** Ruta del descenso: 15 paradas en orden, del atlas. */
export const RUTA_DEL_DESCENSO: string[] = [
  'lugar-1',
  'lugar-2',
  'lugar-3',
  'lugar-4',
  'lugar-17',
  'lugar-18',
  'lugar-19',
  'lugar-20',
  'lugar-24',
  'lugar-25',
  'lugar-26',
  'lugar-27',
  'lugar-28',
  'lugar-29',
  'lugar-30',
];

export interface Travesia {
  nombre: string;
  paradas: string[]; // ids lugar-N en orden
}

export const TRAVESIAS: Travesia[] = [
  { nombre: 'Caldemar → Mar de Hierro → Hrimgard', paradas: ['lugar-6', 'lugar-13', 'lugar-9'] },
  { nombre: 'Caldemar → Mar de las Lámparas → Sehet-Amar → Salar de los Sin Sombra', paradas: ['lugar-6', 'lugar-14', 'lugar-10', 'lugar-11'] },
  { nombre: 'Caldemar → Océano Pálido → Archipiélago de Ignara', paradas: ['lugar-6', 'lugar-15', 'lugar-12'] },
  { nombre: 'Sylmora → Mar Ciego', paradas: ['lugar-8', 'lugar-16'] },
  { nombre: 'Brunnak → Páramo de los Colosos', paradas: ['lugar-7', 'lugar-23'] },
];

export interface EntradaMenor {
  desde: string; // id lugar-N
  nombre: string;
  /** Destinos cerrados por el atlas; vacío cuando el atlas deja el destino abierto. */
  destinos: string[];
  destinoAbierto: boolean;
  nota: string;
}

/**
 * Entradas menores. El destino exacto de las últimas tres sigue abierto
 * en la biblia, tal como lo dice el atlas; no se inventa destino.
 */
export const ENTRADAS_MENORES: EntradaMenor[] = [
  {
    desde: 'lugar-7',
    nombre: 'Minas selladas de Brunnak',
    destinos: ['lugar-24', 'lugar-23'],
    destinoAbierto: false,
    nota: 'En la bifurcación profunda, un ramal roza Cinerea y otro alcanza el Páramo de los Colosos.',
  },
  {
    desde: 'lugar-10',
    nombre: 'Pozos de contrato de Sehet-Amar',
    destinos: [],
    destinoAbierto: true,
    nota: 'El destino exacto de esta entrada sigue abierto en la biblia.',
  },
  {
    desde: 'lugar-16',
    nombre: 'Remolino del Mar Ciego',
    destinos: [],
    destinoAbierto: true,
    nota: 'El destino exacto de esta entrada sigue abierto en la biblia.',
  },
  {
    desde: 'lugar-12',
    nombre: 'Cráter mayor de Ignara',
    destinos: [],
    destinoAbierto: true,
    nota: 'El destino exacto de esta entrada sigue abierto en la biblia.',
  },
];

export interface AccesoEspecial {
  lugar: string; // id lugar-N
  acceso: string;
}

export const ACCESOS_ESPECIALES: AccesoEspecial[] = [
  { lugar: 'lugar-21', acceso: 'El Sopor se alcanza dormido.' },
  { lugar: 'lugar-22', acceso: 'El Empíreo se alcanza por las grietas del Sello.' },
];

export interface DiaGarganta {
  dia: number;
  titulo: string;
  texto: string;
}

/** La Garganta en nueve días: itinerario del atlas, texto tal cual. */
export const GARGANTA_NUEVE_DIAS: DiaGarganta[] = [
  { dia: 1, titulo: 'Cornisa y torno', texto: 'Registrar carga y dejar anclaje de regreso. La primera cascada cierra la ruta exterior durante las crecidas.' },
  { dia: 2, titulo: 'Escalera tallada', texto: 'Salvar un tramo desmoronado por la cornisa. El nicho de relevo permite acampar.' },
  { dia: 3, titulo: 'Primer pueblo colgado', texto: 'Cruzar el puente de cuerda hacia las cabañas. La trampilla de la cabaña baja al andamio de servicio.' },
  { dia: 4, titulo: 'Taller del contrapeso', texto: 'Accionar el torno desde el piso superior. El sendero tallado rodea el elevador cuando falla.' },
  { dia: 5, titulo: 'Cascadas interiores', texto: 'Cruzar tras la cortina de agua con línea de seguridad. El refugio está al otro lado.' },
  { dia: 6, titulo: 'Paso de los nidos', texto: 'Elegir la pasarela expuesta o la cornisa inferior. Ambas convergen en el mismo rellano.' },
  { dia: 7, titulo: 'Último poblado', texto: 'Reabastecerse y consultar qué barcazas recogen pavesas. Un segundo elevador baja al tramo seco.' },
  { dia: 8, titulo: 'Roca seca', texto: 'Seguir las marcas de cuerda a través de los túneles. El último refugio queda antes del arco.' },
  { dia: 9, titulo: 'Puerta de Hueso', texto: 'Salir de la roca mortal, marcar el arco y reconocer la orilla del Pavesal antes de embarcar.' },
];

// ---- Utilidades (solo conexiones del atlas) ----

export function lugarPorId(id: string): LugarAtlas | undefined {
  return LUGARES.find((l) => l.id === id);
}

export function urlMapa(slug: string): string {
  return `/maps/${slug}.webp`;
}

export function todosLosMapas(): MapaAtlas[] {
  return LUGARES.flatMap((l) => l.mapas);
}

export function posicionEnDescenso(id: string): number {
  return RUTA_DEL_DESCENSO.indexOf(id);
}

export function anteriorEnDescenso(id: string): string | null {
  const i = posicionEnDescenso(id);
  return i > 0 ? RUTA_DEL_DESCENSO[i - 1] : null;
}

export function siguienteEnDescenso(id: string): string | null {
  const i = posicionEnDescenso(id);
  return i >= 0 && i < RUTA_DEL_DESCENSO.length - 1 ? RUTA_DEL_DESCENSO[i + 1] : null;
}

export function travesiasDeLugar(id: string): Travesia[] {
  return TRAVESIAS.filter((t) => t.paradas.includes(id));
}

export function entradasDesdeLugar(id: string): EntradaMenor[] {
  return ENTRADAS_MENORES.filter((e) => e.desde === id);
}

export function accesoEspecialDeLugar(id: string): AccesoEspecial | undefined {
  return ACCESOS_ESPECIALES.find((a) => a.lugar === id);
}
