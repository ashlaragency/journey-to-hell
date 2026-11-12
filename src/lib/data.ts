// Catálogos del creador guiado de personaje y del juego.
// Todo se elige tocando: el único campo que se escribe es el nombre.

export interface SpeciesOpt {
  name: string;
  desc: string;
  strength: string;
  names: string[];
}

export const SPECIES: SpeciesOpt[] = [
  { name: 'Humano', desc: 'Versátil y ambicioso. Aprende de todo y se adapta a cualquier vida.', strength: 'Se adapta a todo', names: ['Aria', 'Bruno', 'Carmen', 'Diego'] },
  { name: 'Elfo', desc: 'Grácil y longevo. Ve en la oscuridad y siente la magia del bosque.', strength: 'Vista aguda y magia', names: ['Elandor', 'Lúthien', 'Faelar', 'Sylvara'] },
  { name: 'Enano', desc: 'Fuerte y terco como la roca. Resiste el veneno y conoce la piedra.', strength: 'Muy resistente', names: ['Thorin', 'Balin', 'Dís', 'Gimli'] },
  { name: 'Mediano', desc: 'Pequeño, valiente y con suerte. Difícil de asustar y de atrapar.', strength: 'Suerte increíble', names: ['Frodo', 'Bilbo', 'Merry', 'Pippin'] },
  { name: 'Gnomo', desc: 'Curioso e ingenioso. Su mente inventa cosas y resiste la magia.', strength: 'Mente despierta', names: ['Nackle', 'Boddynock', 'Wrenn', 'Zook'] },
  { name: 'Semielfo', desc: 'Mitad humano, mitad elfo. Encantador y con un pie en dos mundos.', strength: 'Encanto natural', names: ['Aelar', 'Seraphina', 'Dorian', 'Elowen'] },
  { name: 'Semiorco', desc: 'Fuerte y feroz. Cuando cae, se niega a rendirse y sigue peleando.', strength: 'Nunca se rinde', names: ['Grom', 'Karg', 'Mog', 'Thrak'] },
  { name: 'Tiefling', desc: 'Con sangre infernal: cuernos, cola y fuego en la mirada. Resiste el fuego.', strength: 'Resiste el fuego', names: ['Lilith', 'Azazel', 'Mordai', 'Vex'] },
  { name: 'Dracónico', desc: 'Descendiente de dragones: escamas, aliento elemental y presencia imponente.', strength: 'Aliento de dragón', names: ['Drogon', 'Saphira', 'Vermax', 'Rhaenys'] },
  { name: 'Aasimar', desc: 'Tocad@ por lo celestial. Una luz interior lo guía y lo protege.', strength: 'Luz celestial', names: ['Uriel', 'Serafín', 'Aurora', 'Cassiel'] },
  { name: 'Firbolg', desc: 'Gigante amable del bosque. Habla con las bestias y se funde con la naturaleza.', strength: 'Amigo del bosque', names: ['Bram', 'Yew', 'Sage', 'Rowan'] },
  { name: 'Goliat', desc: 'Enorme y fuerte como una montaña. Aguanta el frío y la altura.', strength: 'Fuerza de montaña', names: ['Korg', 'Thun', 'Asha', 'Bramm'] },
  { name: 'Kenku', desc: 'Pájaro que imita voces y sonidos. Callado, pero lo copia todo.', strength: 'Imita cualquier voz', names: ['Kree', 'Caw', 'Talon', 'Beak'] },
  { name: 'Tabaxi', desc: 'Gato humanoide: ágil, curioso y siempre con algo brillante en el bolsillo.', strength: 'Agilidad felina', names: ['Mishi', 'Zara', 'Paws', 'Whiskers'] },
  { name: 'Tortle', desc: 'Tortuga sabia con caparazón propio. Lento, tranquilo y muy difícil de herir.', strength: 'Caparazón natural', names: ['Kappa', 'Shelly', 'Boulder', 'Tuga'] },
  { name: 'Genasi', desc: 'Sangre elemental: fuego, agua, aire o tierra corre por sus venas.', strength: 'Poder elemental', names: ['Ember', 'Marina', 'Zephyr', 'Terra'] },
  { name: 'Aarakocra', desc: 'Ave humanoide que vuela. Ve el mundo desde arriba.', strength: 'Puede volar', names: ['Skye', 'Feather', 'Gale', 'Wren'] },
  { name: 'Minotauro', desc: 'Toro imponente con cuernos poderosos. Nadie se pierde con su olfato.', strength: 'Cuernos poderosos', names: ['Taurus', 'Bovine', 'Mino', 'Horn'] },
  { name: 'Centauro', desc: 'Mitad humano, mitad caballo. Veloz y fuerte como el viento.', strength: 'Velocidad de caballo', names: ['Chiron', 'Pholus', 'Nessus', 'Rhea'] },
  { name: 'Sátiro', desc: 'Alegre y musical, con cuernos de cabra. Encanta con su música y su risa.', strength: 'Encanto musical', names: ['Pan', 'Fauno', 'Lyra', 'Baco'] },
  { name: 'Hada', desc: 'Pequeña criatura alada del bosque encantado. Vuela y brilla con magia feérica.', strength: 'Magia feérica', names: ['Tinker', 'Pixie', 'Luna', 'Moth'] },
];

export interface ClassOpt {
  name: string;
  hitDie: number;
  difficulty: 'Fácil' | 'Media' | 'Con práctica';
  role: string;
  desc: string;
  primary: 'FUE' | 'DES' | 'CON' | 'INT' | 'SAB' | 'CAR';
  skills: string[];
  skillCount: number;
  saves: string[];
  defaultArmor: string;
  defaultWeapon: string;
}

export const CLASSES: ClassOpt[] = [
  { name: 'Guerrero', hitDie: 10, difficulty: 'Fácil', role: 'Pelea cuerpo a cuerpo', desc: 'El más sencillo para empezar: pega fuerte, aguanta mucho y no se complica.', primary: 'FUE', skills: ['Acrobacias', 'Atletismo', 'Historia', 'Intimidación', 'Percepción', 'Supervivencia'], skillCount: 2, saves: ['Fuerza', 'Constitución'], defaultArmor: 'Cota de malla', defaultWeapon: 'Espada larga' },
  { name: 'Pícaro', hitDie: 8, difficulty: 'Fácil', role: 'Sigilo y daño preciso', desc: 'Se mueve sin hacer ruido, abre cerraduras y pega donde más duele.', primary: 'DES', skills: ['Acrobacias', 'Atletismo', 'Engaño', 'Intimidación', 'Investigación', 'Juego de manos', 'Percepción', 'Persuasión', 'Sigilo'], skillCount: 4, saves: ['Destreza', 'Inteligencia'], defaultArmor: 'Cuero tachonado', defaultWeapon: 'Espada corta' },
  { name: 'Bárbaro', hitDie: 12, difficulty: 'Fácil', role: 'Furia y fuerza bruta', desc: 'Entra en furia y pega como un huracán. El que más vida tiene de todos.', primary: 'FUE', skills: ['Atletismo', 'Intimidación', 'Naturaleza', 'Percepción', 'Supervivencia', 'Trato con animales'], skillCount: 2, saves: ['Fuerza', 'Constitución'], defaultArmor: 'Sin armadura', defaultWeapon: 'Hacha de batalla' },
  { name: 'Clérigo', hitDie: 8, difficulty: 'Media', role: 'Cura y protege', desc: 'Cura a sus amigos, protege al grupo y llama a su dios en los momentos difíciles.', primary: 'SAB', skills: ['Historia', 'Medicina', 'Perspicacia', 'Persuasión', 'Religión'], skillCount: 2, saves: ['Sabiduría', 'Carisma'], defaultArmor: 'Cota de escamas', defaultWeapon: 'Maza' },
  { name: 'Paladín', hitDie: 10, difficulty: 'Media', role: 'Caballero sagrado', desc: 'Un guerrero con juramento: pega fuerte, cura un poco y protege a los débiles.', primary: 'FUE', skills: ['Atletismo', 'Intimidación', 'Medicina', 'Persuasión', 'Perspicacia', 'Religión'], skillCount: 2, saves: ['Sabiduría', 'Carisma'], defaultArmor: 'Cota de malla', defaultWeapon: 'Espada larga' },
  { name: 'Explorador', hitDie: 10, difficulty: 'Media', role: 'Rastreador del bosque', desc: 'Conoce el monte, rastrea huellas y dispara desde lejos. Su mejor amigo es el arco.', primary: 'DES', skills: ['Atletismo', 'Investigación', 'Naturaleza', 'Percepción', 'Sigilo', 'Supervivencia', 'Trato con animales'], skillCount: 3, saves: ['Fuerza', 'Destreza'], defaultArmor: 'Cuero tachonado', defaultWeapon: 'Arco largo' },
  { name: 'Mago', hitDie: 6, difficulty: 'Con práctica', role: 'Magia poderosa', desc: 'El que más conjuros sabe. Frágil, pero con un libro de hechizos puede cambiar el mundo.', primary: 'INT', skills: ['Conocimiento arcano', 'Historia', 'Investigación', 'Medicina', 'Religión'], skillCount: 2, saves: ['Inteligencia', 'Sabiduría'], defaultArmor: 'Sin armadura', defaultWeapon: 'Bastón' },
  { name: 'Hechicero', hitDie: 6, difficulty: 'Media', role: 'Magia innata', desc: 'La magia le nace de dentro, sin libros. Pocos conjuros, pero los lanza con el corazón.', primary: 'CAR', skills: ['Conocimiento arcano', 'Engaño', 'Intimidación', 'Persuasión', 'Religión'], skillCount: 2, saves: ['Constitución', 'Carisma'], defaultArmor: 'Sin armadura', defaultWeapon: 'Daga' },
  { name: 'Brujo', hitDie: 8, difficulty: 'Media', role: 'Pacto oscuro', desc: 'Hizo un pacto con un ser poderoso y a cambio recibió magia extraña y un don.', primary: 'CAR', skills: ['Conocimiento arcano', 'Engaño', 'Historia', 'Intimidación', 'Investigación', 'Naturaleza', 'Religión'], skillCount: 2, saves: ['Sabiduría', 'Carisma'], defaultArmor: 'Cuero', defaultWeapon: 'Daga' },
  { name: 'Druida', hitDie: 8, difficulty: 'Media', role: 'Magia de la naturaleza', desc: 'Habla con los animales, se convierte en bestia y la naturaleza pelea de su lado.', primary: 'SAB', skills: ['Conocimiento arcano', 'Medicina', 'Naturaleza', 'Percepción', 'Religión', 'Supervivencia', 'Trato con animales'], skillCount: 2, saves: ['Inteligencia', 'Sabiduría'], defaultArmor: 'Cuero', defaultWeapon: 'Bastón' },
  { name: 'Bardo', hitDie: 8, difficulty: 'Media', role: 'Música y palabras', desc: 'Canta, cuenta historias y con sus palabras inspira a sus amigos y confunde a sus enemigos.', primary: 'CAR', skills: ['Acrobacias', 'Atletismo', 'Conocimiento arcano', 'Engaño', 'Historia', 'Interpretación', 'Intimidación', 'Investigación', 'Juego de manos', 'Medicina', 'Naturaleza', 'Percepción', 'Perspicacia', 'Persuasión', 'Religión', 'Sigilo', 'Supervivencia', 'Trato con animales'], skillCount: 3, saves: ['Destreza', 'Carisma'], defaultArmor: 'Cuero', defaultWeapon: 'Espada corta' },
  { name: 'Monje', hitDie: 8, difficulty: 'Con práctica', role: 'Puños y velocidad', desc: 'Pelea sin armas, con el cuerpo entrenado. Rápido como el viento y sereno como el agua.', primary: 'DES', skills: ['Acrobacias', 'Atletismo', 'Historia', 'Perspicacia', 'Religión', 'Sigilo'], skillCount: 2, saves: ['Fuerza', 'Destreza'], defaultArmor: 'Sin armadura', defaultWeapon: 'Bastón' },
  { name: 'Artífice', hitDie: 8, difficulty: 'Con práctica', role: 'Inventor mágico', desc: 'Crea objetos mágicos e inventos. Su magia sale de sus herramientas y su ingenio.', primary: 'INT', skills: ['Conocimiento arcano', 'Historia', 'Investigación', 'Medicina', 'Naturaleza', 'Percepción', 'Juego de manos'], skillCount: 2, saves: ['Constitución', 'Inteligencia'], defaultArmor: 'Cuero tachonado', defaultWeapon: 'Ballesta ligera' },
];

export interface BackgroundOpt {
  name: string;
  desc: string;
  skills: string[];
}

export const BACKGROUNDS: BackgroundOpt[] = [
  { name: 'Héroe del pueblo', desc: 'Salvaste a tu pueblo de un peligro y ahora todos te conocen.', skills: ['Atletismo', 'Supervivencia'] },
  { name: 'Soldado', desc: 'Serviste en un ejército. Sabes obedecer, mandar y sobrevivir a la guerra.', skills: ['Atletismo', 'Intimidación'] },
  { name: 'Criminal', desc: 'Viviste al margen de la ley. Conoces las calles, las cerraduras y los secretos.', skills: ['Engaño', 'Sigilo'] },
  { name: 'Sabio', desc: 'Pasaste años entre libros. Sabes cosas que casi nadie sabe.', skills: ['Conocimiento arcano', 'Historia'] },
  { name: 'Acólito', desc: 'Serviste en un templo. Conoces los ritos, los dioses y a la gente que reza.', skills: ['Perspicacia', 'Religión'] },
  { name: 'Noble', desc: 'Naciste entre riquezas y títulos. Sabes hablar, mandar y moverte entre poderosos.', skills: ['Historia', 'Persuasión'] },
  { name: 'Artista', desc: 'Viviste del arte: música, teatro o pintura. Donde llegas, la gente te recuerda.', skills: ['Acrobacias', 'Interpretación'] },
  { name: 'Ermitaño', desc: 'Viviste solo, lejos de todos, buscando una verdad. La soledad te hizo fuerte.', skills: ['Medicina', 'Religión'] },
  { name: 'Forastero', desc: 'Creciste en lo salvaje, lejos de las ciudades. El monte es tu casa.', skills: ['Atletismo', 'Supervivencia'] },
  { name: 'Marino', desc: 'Viviste en el mar. Sabes de barcos, tormentas y puertos lejanos.', skills: ['Atletismo', 'Percepción'] },
  { name: 'Artesano', desc: 'Aprendiste un oficio con tus manos: herrero, carpintero, alfarero.', skills: ['Perspicacia', 'Persuasión'] },
  { name: 'Huérfano', desc: 'Creciste sin familia, en las calles. Aprendiste a valerte solo desde niño.', skills: ['Juego de manos', 'Sigilo'] },
];

export interface SkillDef {
  name: string;
  ability: 'FUE' | 'DES' | 'CON' | 'INT' | 'SAB' | 'CAR';
}

export const SKILLS: SkillDef[] = [
  { name: 'Acrobacias', ability: 'DES' },
  { name: 'Atletismo', ability: 'FUE' },
  { name: 'Conocimiento arcano', ability: 'INT' },
  { name: 'Engaño', ability: 'CAR' },
  { name: 'Historia', ability: 'INT' },
  { name: 'Interpretación', ability: 'CAR' },
  { name: 'Intimidación', ability: 'CAR' },
  { name: 'Investigación', ability: 'INT' },
  { name: 'Juego de manos', ability: 'DES' },
  { name: 'Medicina', ability: 'SAB' },
  { name: 'Naturaleza', ability: 'INT' },
  { name: 'Percepción', ability: 'SAB' },
  { name: 'Perspicacia', ability: 'SAB' },
  { name: 'Persuasión', ability: 'CAR' },
  { name: 'Religión', ability: 'INT' },
  { name: 'Sigilo', ability: 'DES' },
  { name: 'Supervivencia', ability: 'SAB' },
  { name: 'Trato con animales', ability: 'SAB' },
];

export interface WeaponOpt {
  name: string;
  dice: string;
  type: string;
}

export const WEAPONS: WeaponOpt[] = [
  { name: 'Espada larga', dice: '1d8', type: 'cortante' },
  { name: 'Espada corta', dice: '1d6', type: 'perforante' },
  { name: 'Hacha de batalla', dice: '1d8', type: 'cortante' },
  { name: 'Maza', dice: '1d6', type: 'contundente' },
  { name: 'Daga', dice: '1d4', type: 'perforante' },
  { name: 'Par de dagas', dice: '1d4', type: 'perforante' },
  { name: 'Arco corto', dice: '1d6', type: 'perforante' },
  { name: 'Arco largo', dice: '1d8', type: 'perforante' },
  { name: 'Ballesta ligera', dice: '1d8', type: 'perforante' },
  { name: 'Lanza', dice: '1d6', type: 'perforante' },
  { name: 'Bastón', dice: '1d6', type: 'contundente' },
  { name: 'Martillo de guerra', dice: '1d8', type: 'contundente' },
  { name: 'Cuchillo curvo', dice: '1d4', type: 'cortante' },
  { name: 'Honda', dice: '1d4', type: 'contundente' },
];

export interface ArmorOpt {
  name: string;
  base: number;
  dexMax: number | null;
  desc: string;
  tortleOnly?: boolean;
}

export const ARMORS: ArmorOpt[] = [
  { name: 'Sin armadura', base: 10, dexMax: null, desc: 'Solo tu agilidad te protege' },
  { name: 'Acolchada', base: 11, dexMax: null, desc: 'Tela gruesa y rellena' },
  { name: 'Cuero', base: 11, dexMax: null, desc: 'Cuero curtido, ligero' },
  { name: 'Cuero tachonado', base: 12, dexMax: null, desc: 'Cuero con tachuelas de metal' },
  { name: 'Cota de escamas', base: 14, dexMax: 2, desc: 'Escamas de metal cosidas' },
  { name: 'Coraza', base: 14, dexMax: 2, desc: 'Placas sobre cuero' },
  { name: 'Cota de malla', base: 16, dexMax: 2, desc: 'Anillos de metal entrelazados' },
  { name: 'Armadura de placas', base: 18, dexMax: 0, desc: 'La mejor protección, pesada' },
  { name: 'Caparazón natural', base: 17, dexMax: 0, desc: 'Tu propio caparazón (solo Tortle)', tortleOnly: true },
];

export const PACKS = [
  'Mochila de aventurero',
  'Mochila de explorador',
  'Mochila de ladrón',
  'Mochila de sacerdote',
  'Mochila de artista',
  'Mochila de erudito',
];

export const PERSONALITIES = [
  'Valiente y bromista',
  'Serio y callado',
  'Travieso y bromista',
  'Curioso por todo',
  'Protector de sus amigos',
  'Ambicioso y soñador',
  'Tranquilo y paciente',
  'Impulsivo y atrevido',
  'Amable con todos',
  'Desconfiado y precavido',
  'Orgulloso de su origen',
  'Leal hasta la muerte',
];

export const MOTIVATIONS = [
  'Hacerse rico',
  'Ser famoso y recordado',
  'Proteger a su familia',
  'Vengarse de alguien',
  'Encontrar un tesoro perdido',
  'Descubrir un secreto antiguo',
  'Ser el mejor en lo suyo',
  'Ayudar a los que no tienen nada',
  'Ver el mundo entero',
  'Romper una maldición',
  'Encontrar a alguien perdido',
  'Probar que es un héroe',
];

export const ABILITIES = ['FUE', 'DES', 'CON', 'INT', 'SAB', 'CAR'] as const;
export const ABILITY_NAMES: Record<string, string> = {
  FUE: 'Fuerza',
  DES: 'Destreza',
  CON: 'Constitución',
  INT: 'Inteligencia',
  SAB: 'Sabiduría',
  CAR: 'Carisma',
};
export const ABILITY_HELP: Record<string, string> = {
  FUE: 'Para pegar fuerte y cargar cosas',
  DES: 'Para ser ágil, esquivar y moverte sin ruido',
  CON: 'Para aguantar golpes y tener más vida',
  INT: 'Para saber cosas y lanzar magia de estudio',
  SAB: 'Para darte cuenta de las cosas y curar',
  CAR: 'Para hablar, convencer y encantar',
};

export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((level - 1) / 4);
}

export function calcAC(armorName: string, dex: number, shield: boolean, className: string, wis: number, con: number): number {
  const armor = ARMORS.find((a) => a.name === armorName) ?? ARMORS[0];
  let ac = armor.base;
  if (armor.dexMax === null) ac += abilityMod(dex);
  else ac += Math.min(abilityMod(dex), armor.dexMax);
  if (shield) ac += 2;
  // Bárbaro y Monje sin armadura: defensa sin armadura
  if (armorName === 'Sin armadura') {
    if (className === 'Bárbaro') ac = Math.max(ac, 10 + abilityMod(dex) + abilityMod(con));
    if (className === 'Monje') ac = Math.max(ac, 10 + abilityMod(dex) + abilityMod(wis));
  }
  return ac;
}

export function rollDie(sides: number): number {
  return 1 + Math.floor(Math.random() * sides);
}

export function roll4d6DropLowest(): number {
  const rolls = [rollDie(6), rollDie(6), rollDie(6), rollDie(6)].sort((a, b) => a - b);
  return rolls[1] + rolls[2] + rolls[3];
}
