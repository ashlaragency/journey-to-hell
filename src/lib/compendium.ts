// Compendio SRD básico (semilla) y las 9 aventuras como respaldo local
// (se usan si las tablas de Supabase aún están vacías).

export interface MonsterEntry {
  name: string;
  type: string;
  cr: string;
  hp: number;
  ac: number;
  desc: string;
}

export const MONSTERS: MonsterEntry[] = [
  { name: 'Goblin', type: 'Humanoide', cr: '1/4', hp: 7, ac: 15, desc: 'Pequeño, verde y escurridizo. Ataca en grupo y huye cuando pierde.' },
  { name: 'Orco', type: 'Humanoide', cr: '1/2', hp: 15, ac: 13, desc: 'Fuerte y agresivo. Cuando cae, se niega a rendirse una vez más.' },
  { name: 'Esqueleto', type: 'No muerto', cr: '1/4', hp: 13, ac: 13, desc: 'Huesos animados por magia oscura. No siente miedo ni cansancio.' },
  { name: 'Zombi', type: 'No muerto', cr: '1/4', hp: 22, ac: 8, desc: 'Camina lento, pero no se detiene. Aunque lo derribes, puede levantarse.' },
  { name: 'Lobo', type: 'Bestia', cr: '1/4', hp: 11, ac: 13, desc: 'Caza en manada y derriba a su presa trabajando en equipo.' },
  { name: 'Lobo terrible', type: 'Bestia', cr: '1', hp: 37, ac: 14, desc: 'Un lobo enorme, casi del tamaño de un caballo. Su aullido hiela la sangre.' },
  { name: 'Oso pardo', type: 'Bestia', cr: '1', hp: 34, ac: 11, desc: 'Fuerza bruta con garras. Mejor no ponerse entre él y su comida.' },
  { name: 'Araña gigante', type: 'Bestia', cr: '1', hp: 26, ac: 14, desc: 'Teje telarañas y caza con veneno. Puede trepar por las paredes.' },
  { name: 'Serpiente venenosa', type: 'Bestia', cr: '1/8', hp: 2, ac: 13, desc: 'Pequeña, rápida y con un veneno que duele mucho.' },
  { name: 'Murciélago gigante', type: 'Bestia', cr: '1/4', hp: 22, ac: 13, desc: 'Vuela en la oscuridad y caza de noche con sus colmillos.' },
  { name: 'Rata gigante', type: 'Bestia', cr: '1/8', hp: 7, ac: 12, desc: 'Una rata del tamaño de un perro. Vive en alcantarillas y criptas.' },
  { name: 'Buho gigante', type: 'Bestia', cr: '1/4', hp: 19, ac: 12, desc: 'Sabio y silencioso. Ve en la oscuridad total.' },
  { name: 'Gnoll', type: 'Humanoide', cr: '1/2', hp: 22, ac: 15, desc: 'Hiena humanoide que caza en manada y ríe antes de atacar.' },
  { name: 'Kobold', type: 'Humanoide', cr: '1/8', hp: 5, ac: 12, desc: 'Pequeño dragón sirviente. Débil solo, peligroso en grupo y con trampas.' },
  { name: 'Hobgoblin', type: 'Humanoide', cr: '1/2', hp: 11, ac: 18, desc: 'Guerrero disciplinado con armadura y formación de batalla.' },
  { name: 'Bandido', type: 'Humanoide', cr: '1/8', hp: 11, ac: 12, desc: 'Asalta caminos y tabernas. Pelea por monedas, no por honor.' },
  { name: 'Cultista', type: 'Humanoide', cr: '1/8', hp: 9, ac: 12, desc: 'Sirve a un poder oscuro y recita palabras que no deberían decirse.' },
  { name: 'Fantasma', type: 'No muerto', cr: '4', hp: 45, ac: 11, desc: 'El espíritu de alguien que no descansó. Atraviesa paredes y asusta.' },
  { name: 'Espectro', type: 'No muerto', cr: '1', hp: 22, ac: 12, desc: 'Sombra que drena la vida con su toque frío.' },
  { name: 'Momia', type: 'No muerto', cr: '3', hp: 58, ac: 11, desc: 'Envuelta en vendas antiguas. Su toque pudre lo que toca.' },
  { name: 'Ogro', type: 'Gigante', cr: '2', hp: 59, ac: 11, desc: 'Enorme, tonto y con un garrote del tamaño de un árbol.' },
  { name: 'Trol', type: 'Gigante', cr: '5', hp: 84, ac: 15, desc: 'Se regenera de casi todo. Solo el fuego y el ácido lo detienen.' },
  { name: 'Hombre lobo', type: 'Humanoide', cr: '3', hp: 58, ac: 12, desc: 'De día es una persona; de noche, una bestia con garras y colmillos.' },
  { name: 'Dragón rojo joven', type: 'Dragón', cr: '10', hp: 178, ac: 18, desc: 'Escamas rojas, aliento de fuego y un orgullo más grande que su tesoro.' },
];

export interface SpellEntry {
  name: string;
  level: number;
  school: string;
  desc: string;
}

export const SPELLS: SpellEntry[] = [
  { name: 'Bola de fuego', level: 3, school: 'Evocación', desc: 'Una explosión de fuego que quema todo en un radio de 6 metros. Daño: 8d6.' },
  { name: 'Misil mágico', level: 1, school: 'Evocación', desc: 'Tres dardos de luz que siempre dan en el blanco. Daño: 3 x (1d4+1).' },
  { name: 'Curar heridas', level: 1, school: 'Abjuración', desc: 'Tocas a una criatura y la curas. Cura: 1d8 + tu modificador.' },
  { name: 'Escudo', level: 1, school: 'Abjuración', desc: 'Una barrera invisible te protege: +5 a tu defensa hasta tu próximo turno.' },
  { name: 'Rayo de escarcha', level: 0, school: 'Evocación', desc: 'Un rayo frío que hace 1d8 de daño y hace más lenta a la víctima.' },
  { name: 'Luz', level: 0, school: 'Evocación', desc: 'Haces brillar un objeto como una antorcha durante una hora.' },
  { name: 'Manos ardientes', level: 1, school: 'Evocación', desc: 'Un abanico de llamas sale de tus manos. Daño: 3d6 en un cono.' },
  { name: 'Dormir', level: 1, school: 'Encantamiento', desc: 'Duerme a las criaturas más débiles cercanas. Afecta 5d8 puntos de vida en total.' },
  { name: 'Encantar persona', level: 1, school: 'Encantamiento', desc: 'Haces que una persona te vea como un amigo durante una hora.' },
  { name: 'Detectar magia', level: 1, school: 'Adivinación', desc: 'Sientes la magia cercana y ves su brillo durante 10 minutos.' },
  { name: 'Invisibilidad', level: 2, school: 'Ilusión', desc: 'Tú o alguien más se vuelve invisible hasta que ataque o lance un conjuro.' },
  { name: 'Telaraña', level: 2, school: 'Conjuración', desc: 'Llenas un área de telarañas pegajosas que atrapan a quien pase.' },
  { name: 'Relámpago', level: 3, school: 'Evocación', desc: 'Un rayo en línea recta que quema a todos en su camino. Daño: 8d6.' },
  { name: 'Volar', level: 3, school: 'Transmutación', desc: 'Te da alas invisibles: puedes volar durante 10 minutos.' },
  { name: 'Disipar magia', level: 3, school: 'Abjuración', desc: 'Apaga la magia de un conjuro o un objeto mágico.' },
  { name: 'Revitalizar', level: 3, school: 'Nigromancia', desc: 'Devuelve la vida a una criatura muerta recientemente, con 1 punto de vida.' },
  { name: 'Bola de nieve', level: 1, school: 'Evocación', desc: 'Una bola de hielo que hace 3d6 de daño frío.' },
  { name: 'Armadura de mago', level: 1, school: 'Abjuración', desc: 'Te protege con magia: tu defensa base pasa a ser 13 + tu agilidad, por 8 horas.' },
  { name: 'Palabra de curación', level: 1, school: 'Abjuración', desc: 'Curas a un amigo a distancia con solo una palabra. Cura: 1d4 + tu modificador.' },
  { name: 'Bendición', level: 1, school: 'Encantamiento', desc: 'Bendices a tus amigos: suman 1d4 a sus ataques y salvaciones por un minuto.' },
  { name: 'Rayo guía', level: 1, school: 'Evocación', desc: 'Un rayo de luz que hace 4d6 de daño y marca al enemigo para que el siguiente ataque le pegue más fácil.' },
  { name: 'Nube apestosa', level: 1, school: 'Conjuración', desc: 'Una nube de gas horrible que hace vomitar y huir a quien la respire.' },
  { name: 'Paso brumoso', level: 2, school: 'Conjuración', desc: 'Te teletransportas 9 metros en un instante, envuelto en niebla.' },
  { name: 'Oscuridad', level: 2, school: 'Evocación', desc: 'Creas una esfera de oscuridad mágica que ni la vista oscura penetra.' },
];

export interface ConditionEntry {
  name: string;
  desc: string;
}

export const CONDITIONS: ConditionEntry[] = [
  { name: 'Aturdido', desc: 'No puedes actuar ni moverte. Fallas las salvaciones de Fuerza y Destreza y los ataques contra ti tienen ventaja.' },
  { name: 'Cegado', desc: 'No puedes ver. Tus ataques fallan más y los ataques contra ti pegan más fácil.' },
  { name: 'Asustado', desc: 'Tienes miedo de algo: no puedes acercarte a eso y tus ataques y pruebas sufren -2.' },
  { name: 'Agarrado', desc: 'Alguien te tiene sujeto. Tu velocidad es 0 y no puedes moverte.' },
  { name: 'Incapacitado', desc: 'No puedes hacer acciones ni reacciones.' },
  { name: 'Invisible', desc: 'Nadie puede verte. Tus ataques tienen ventaja y los ataques contra ti tienen desventaja.' },
  { name: 'Paralizado', desc: 'No puedes moverte ni hablar. Todo ataque contra ti que pegue es crítico si estás a 1,5 m.' },
  { name: 'Petrificado', desc: 'Convertido en piedra. No puedes actuar y resistes casi todo el daño.' },
  { name: 'Envenenado', desc: 'Te sientes mal: tienes desventaja en ataques y pruebas de habilidad.' },
  { name: 'Derribado', desc: 'Estás en el suelo. Tus ataques cuerpo a cuerpo tienen desventaja; los ataques contra ti cuerpo a cuerpo tienen ventaja.' },
  { name: 'Inmovilizado', desc: 'No puedes moverte. Los ataques contra ti tienen ventaja y tus ataques tienen desventaja.' },
  { name: 'Sordo', desc: 'No puedes oír nada. No puedes escuchar lo que pasa a tu alrededor.' },
];

export interface CombatAction {
  name: string;
  desc: string;
}

export const COMBAT_ACTIONS: CombatAction[] = [
  { name: 'Atacar', desc: 'Pegas con tu arma o con un conjuro. Tiras 1d20 + tu bono de ataque contra la defensa del enemigo.' },
  { name: 'Esquivar', desc: 'Te concentras en no dejar que te peguen: los ataques contra ti tienen desventaja hasta tu próximo turno.' },
  { name: 'Ayudar', desc: 'Ayudas a un amigo: su siguiente tirada tiene ventaja.' },
  { name: 'Esconderse', desc: 'Intentas que nadie te vea: tiras Sigilo contra la Percepción de los demás.' },
  { name: 'Huir', desc: 'Te alejas del peligro. Puedes moverte el doble en tu turno.' },
  { name: 'Preparar', desc: 'Te preparas para actuar cuando pase algo que tú elijas.' },
  { name: 'Correr', desc: 'Te mueves rápido: puedes moverte dos veces en tu turno.' },
  { name: 'Usar un objeto', desc: 'Bebes una poción, enciendes una antorcha o usas algo de tu mochila.' },
];

// Aventuras como respaldo local (idénticas a la semilla de schema.sql)
export interface AdventureSeed {
  name: string;
  duration: 'corta' | 'media' | 'larga';
  durationLabel: string;
  description: string;
  scenes: { place: string; narration: string }[];
  enemies: { name: string; hp: number; ac: number; attack_bonus: number; damage_dice: string }[];
}

export const ADVENTURES_SEED: AdventureSeed[] = [
  {
    name: 'La taberna en llamas', duration: 'corta', durationLabel: 'Corta · 1 hora',
    description: 'Una taberna arde en plena noche y alguien dentro no quiere salir. ¿Rescate, incendio provocado o algo peor?',
    scenes: [
      { place: 'La puerta de la taberna', narration: 'Humo negro sale por la puerta de la taberna. Adentro se oyen gritos y el crujir de la madera. La gente del pueblo mira desde lejos, sin atreverse a entrar.' },
      { place: 'La sala en llamas', narration: 'Las mesas están volcadas y el fuego lame las vigas. En el fondo, una figura tose entre el humo: el tabernero, atrapado bajo una viga caída.' },
      { place: 'La bodega', narration: 'Bajo la taberna, la bodega está intacta… y huele a aceite. Alguien preparó este fuego. En la pared, una lámpara rota y huellas frescas hacia la salida trasera.' },
    ],
    enemies: [
      { name: 'Bandido del fuego', hp: 11, ac: 12, attack_bonus: 3, damage_dice: '1d6' },
      { name: 'Perro asustado', hp: 7, ac: 12, attack_bonus: 2, damage_dice: '1d4' },
    ],
  },
  {
    name: 'El goblin de la campana', duration: 'corta', durationLabel: 'Corta · 1 hora',
    description: 'Cada noche, a las doce, suena una campana que nadie toca. Un goblin la reclama como suya.',
    scenes: [
      { place: 'La plaza a medianoche', narration: 'La plaza está vacía y la campana del templo cuelga inmóvil. De pronto suena: ¡dong! Nadie la tocó. Una risita se pierde entre los tejados.' },
      { place: 'El campanario', narration: 'Suben la escalera de caracol. Arriba, cuerdas cortadas, una bolsita de cosas robadas y huellas pequeñas que bajan por el tejado.' },
      { place: 'La guarida del goblin', narration: 'Bajo el puente, entre trastos, un goblin verde con una campanita en el cuello. "¡Mía!", dice, abrazando sus tesoros. No parece malo… solo solo.' },
    ],
    enemies: [
      { name: 'Goblin travieso', hp: 7, ac: 13, attack_bonus: 3, damage_dice: '1d6' },
      { name: 'Rata de alcantarilla', hp: 5, ac: 11, attack_bonus: 2, damage_dice: '1d4' },
    ],
  },
  {
    name: 'La cripta inundada', duration: 'corta', durationLabel: 'Corta · 1 hora',
    description: 'Bajo el cementerio, una cripta se llenó de agua negra. Algo brilla al fondo.',
    scenes: [
      { place: 'La entrada del cementerio', narration: 'La reja del cementerio está abierta. Las tumbas más viejas tienen flores frescas. Al fondo, unas escaleras bajan a la oscuridad y huele a agua estancada.' },
      { place: 'La cripta', narration: 'El agua negra les llega a las rodillas. Las antorchas no prenden. Algo se mueve bajo el agua, y al fondo brilla una luz pequeña y dorada.' },
      { place: 'El sarcófago', narration: 'En el centro, un sarcófago entreabierto. Dentro no hay huesos: hay un mapa, una espada vieja y un nombre tachado en la piedra.' },
    ],
    enemies: [
      { name: 'Esqueleto mojado', hp: 13, ac: 13, attack_bonus: 3, damage_dice: '1d6' },
      { name: 'Rata gigante', hp: 7, ac: 12, attack_bonus: 3, damage_dice: '1d4' },
    ],
  },
  {
    name: 'La mina de los ecos', duration: 'media', durationLabel: 'Media · 2 a 3 horas',
    description: 'Los mineros oyen sus propias voces repitiendo lo que aún no han dicho. La mina guarda un eco antiguo.',
    scenes: [
      { place: 'La boca de la mina', narration: 'La mina huele a polvo y a viejo. Un minero sale corriendo: "¡No entren! ¡Mi voz me está esperando adentro!".' },
      { place: 'El túnel de los ecos', narration: 'Cada paso suena dos veces. Sus propias voces repiten lo que acaban de decir… y luego lo que aún no han dicho.' },
      { place: 'La veta imposible', narration: 'Al fondo del túnel, una veta de metal negro brilla como un espejo. Refleja a cada uno, pero un poco distinto: más viejo, más cansado.' },
    ],
    enemies: [
      { name: 'Eco hambriento', hp: 15, ac: 12, attack_bonus: 3, damage_dice: '1d6' },
      { name: 'Murciélago gigante', hp: 10, ac: 13, attack_bonus: 3, damage_dice: '1d6' },
    ],
  },
  {
    name: 'El circo de medianoche', duration: 'media', durationLabel: 'Media · 2 a 3 horas',
    description: 'Un circo llega sin avisar, solo de medianoche, y sus artistas no tienen sombra.',
    scenes: [
      { place: 'El campo vacío', narration: 'Al mediodía no hay nada. A medianoche, de la nada, aparecen carpas, luces y música. Un cartel dice: "Una sola función. No se admiten sombras".' },
      { place: 'La carpa principal', narration: 'El presentador no tiene sombra y sonríe demasiado. "¡Pasen, pasen! ¡El espectáculo es ustedes!". El público aplaude, pero nadie tiene cara.' },
      { place: 'La jaula vacía', narration: 'Detrás de las carpas, una jaula abierta. La domadora llora: su bestia, una sombra robada, escapó y ahora vaga por el pueblo buscando un cuerpo.' },
    ],
    enemies: [
      { name: 'Sombra robada', hp: 16, ac: 12, attack_bonus: 4, damage_dice: '1d6' },
      { name: 'Payaso sin risa', hp: 12, ac: 12, attack_bonus: 3, damage_dice: '1d6' },
    ],
  },
  {
    name: 'El faro sin luz', duration: 'media', durationLabel: 'Media · 2 a 3 horas',
    description: 'El faro lleva semanas apagado y los barcos se pierden. El farero no baja desde hace días.',
    scenes: [
      { place: 'El camino del acantilado', narration: 'El viento pega fuerte y el mar ruge abajo. El faro se ve apagado contra el cielo gris. En el camino hay huellas que van… y no vuelven.' },
      { place: 'La puerta del faro', narration: 'La puerta está entreabierta. Adentro huele a sal y a aceite quemado. La escalera sube en espiral y cada peldaño cruje con un nombre distinto.' },
      { place: 'La linterna', narration: 'Arriba, la gran lámpara está fría. El farero está sentado, mirando el mar, sin moverse. En su bitácora, la última entrada es de mañana.' },
    ],
    enemies: [
      { name: 'Gaviota embrujada', hp: 8, ac: 13, attack_bonus: 3, damage_dice: '1d4' },
      { name: 'Marinero ahogado', hp: 14, ac: 12, attack_bonus: 3, damage_dice: '1d6' },
    ],
  },
  {
    name: 'El valle que no duerme', duration: 'larga', durationLabel: 'Larga · mundo vivo · hasta 8 horas',
    description: 'Un valle donde nadie duerme desde hace un mes. Los sueños de todos se juntan en un solo sueño.',
    scenes: [
      { place: 'La entrada del valle', narration: 'El valle está despierto a las tres de la mañana: luces en las ventanas, gente trabajando, niños jugando. Nadie ha dormido en un mes y nadie tiene sueño.' },
      { place: 'El mercado de los sueños', narration: 'Un mercado vende frascos con sueños: sueños de otros, sueños rotos, sueños que no son de nadie. El vendedor les ofrece el sueño de ustedes… que aún no han soñado.' },
      { place: 'El sueño compartido', narration: 'Al cerrar los ojos, todos sueñan lo mismo: un valle dormido, una puerta y una voz que dice "despiértenme". El sueño es el mapa.' },
    ],
    enemies: [
      { name: 'Insomne furioso', hp: 18, ac: 13, attack_bonus: 4, damage_dice: '1d8' },
      { name: 'Pesadilla pequeña', hp: 10, ac: 12, attack_bonus: 3, damage_dice: '1d6' },
    ],
  },
  {
    name: 'La ciudad bajo la montaña', duration: 'larga', durationLabel: 'Larga · mundo vivo · hasta 8 horas',
    description: 'Bajo la montaña hay una ciudad entera que el mapa olvidó. Sus calles siguen vivas y sus reyes, también.',
    scenes: [
      { place: 'La puerta de piedra', narration: 'La montaña se abre como una puerta. Adentro, una ciudad entera con luz de faroles y olor a pan. Nadie los esperaba, pero todos los conocen.' },
      { place: 'El mercado de los recuerdos', narration: 'Aquí se compran recuerdos con recuerdos. Un niño les ofrece su primer día de escuela a cambio de un recuerdo de ustedes. El mercado huele a infancia.' },
      { place: 'El trono vacío', narration: 'El rey de la ciudad busca heredero y los mira fijamente. "Los forasteros son candidatos", dice. El precio es una memoria, y el trono está vacío por una razón.' },
    ],
    enemies: [
      { name: 'Guardia de piedra', hp: 20, ac: 15, attack_bonus: 4, damage_dice: '1d8' },
      { name: 'Ladrón de recuerdos', hp: 12, ac: 14, attack_bonus: 4, damage_dice: '1d6' },
    ],
  },
  {
    name: 'El pacto del bosque antiguo', duration: 'larga', durationLabel: 'Larga · mundo vivo · hasta 8 horas',
    description: 'El bosque más viejo del mundo pide un pacto nuevo. Los árboles recuerdan el último, y no fue bueno.',
    scenes: [
      { place: 'El lindero', narration: 'Los árboles viejos marcan el lindero con raíces como dedos. Al cruzar, el aire cambia: huele a lluvia vieja y el bosque los está mirando.' },
      { place: 'El claro del pacto', narration: 'En el centro del bosque, un claro redondo donde no crece nada. En el centro, una piedra con las huellas de un pacto roto y un nombre que se borró solo.' },
      { place: 'El espíritu del druida', narration: 'Un espíritu viejo, mitad hombre mitad árbol, los espera. "El pacto quedó a medias", dice. "Yo lo empecé. ¿Quién lo termina?"' },
    ],
    enemies: [
      { name: 'Lobo de raíces', hp: 16, ac: 13, attack_bonus: 4, damage_dice: '1d6' },
      { name: 'Espina andante', hp: 12, ac: 13, attack_bonus: 3, damage_dice: '1d6' },
    ],
  },
];
