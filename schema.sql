-- ============================================================================
-- JOURNEY TO HELL — esquema multijugador
-- Proyecto Supabase: dnd-mundo-vivo (ref lewyzkdhwrdiiorwsfgh)
-- URL: https://lewyzkdhwrdiiorwsfgh.supabase.co
-- ============================================================================
-- CÓMO APLICARLO: abre el panel de Supabase del proyecto dnd-mundo-vivo,
-- ve a "SQL Editor" > "New query", pega TODO este archivo y pulsa "Run".
-- NO aplicar en el proyecto "Plomada" (cxwsjatynrzeabxukolh). Ese no se toca.
-- Se puede ejecutar más de una vez: las tablas usan IF NOT EXISTS y las
-- semillas usan ON CONFLICT DO NOTHING.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. TABLAS
-- --------------------------------------------------------------------------

create table if not exists public.worlds (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Journey to Hell',
  premise text,
  law text,
  created_at timestamptz not null default now()
);

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  world_id uuid references public.worlds(id) on delete cascade,
  name text not null,
  species text not null default 'Humano',
  class_name text not null default 'Guerrero',
  level int not null default 1 check (level between 1 and 20),
  background text,
  personality text,
  motivation text,
  str int not null default 10,
  dex int not null default 10,
  con int not null default 10,
  int int not null default 10,
  wis int not null default 10,
  cha int not null default 10,
  max_hp int not null default 10,
  hp int not null default 10,
  ac int not null default 10,
  weapon text,
  armor text,
  shield boolean not null default false,
  pack text,
  skills jsonb not null default '[]'::jsonb,
  notes text,
  status text not null default 'vivo' check (status in ('vivo', 'caido')),
  death_note text,
  owner_name text,
  created_at timestamptz not null default now(),
  unique (world_id, name)
);
-- El unique(world_id, name) es la ley del mundo: un nombre caído no se puede
-- volver a usar jamás, porque la hoja nunca se borra.

create table if not exists public.legacies (
  id uuid primary key default gen_random_uuid(),
  world_id uuid references public.worlds(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  character_name text not null,
  kind text not null check (kind in ('tumba', 'cancion', 'leyenda', 'objeto', 'lugar')),
  title text not null,
  body text not null,
  place text,
  created_at timestamptz not null default now()
);

create table if not exists public.adventures (
  id uuid primary key default gen_random_uuid(),
  world_id uuid references public.worlds(id) on delete cascade,
  name text not null,
  duration text not null check (duration in ('corta', 'media', 'larga')),
  duration_label text not null,
  description text,
  open_ending text,
  hooks text,
  growth text,
  created_at timestamptz not null default now(),
  unique (world_id, name)
);

create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  adventure_id uuid references public.adventures(id) on delete cascade,
  position int not null default 1,
  place text not null,
  narration text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.enemies (
  id uuid primary key default gen_random_uuid(),
  adventure_id uuid references public.adventures(id) on delete cascade,
  name text not null,
  hp int not null default 10,
  ac int not null default 10,
  attack_bonus int not null default 2,
  damage_dice text not null default '1d6',
  created_at timestamptz not null default now()
);

create table if not exists public.combat (
  id uuid primary key default gen_random_uuid(),
  world_id uuid references public.worlds(id) on delete cascade,
  adventure_id uuid references public.adventures(id) on delete set null,
  active boolean not null default true,
  round int not null default 1,
  turn_index int not null default 0,
  combatants jsonb not null default '[]'::jsonb,
  log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dice_rolls (
  id uuid primary key default gen_random_uuid(),
  world_id uuid references public.worlds(id) on delete cascade,
  player_name text,
  character_name text,
  label text not null,
  dice text not null,
  result int not null,
  detail text,
  created_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  world_id uuid references public.worlds(id) on delete cascade,
  title text,
  body text not null,
  kind text not null default 'cronica' check (kind in ('cronica', 'rumor', 'evento', 'consecuencia', 'evolucion')),
  created_at timestamptz not null default now()
);

create table if not exists public.world_events (
  id uuid primary key default gen_random_uuid(),
  world_id uuid references public.worlds(id) on delete cascade,
  kind text not null check (kind in ('rumor', 'evento', 'consecuencia', 'evolucion_pnj')),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.battle_maps (
  id uuid primary key default gen_random_uuid(),
  world_id uuid references public.worlds(id) on delete cascade,
  name text not null,
  grid_size int not null default 12,
  background text not null default 'pergamino',
  tokens jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Índices útiles
create index if not exists idx_characters_world on public.characters(world_id);
create index if not exists idx_characters_status on public.characters(status);
create index if not exists idx_adventures_world on public.adventures(world_id);
create index if not exists idx_scenes_adventure on public.scenes(adventure_id);
create index if not exists idx_enemies_adventure on public.enemies(adventure_id);
create index if not exists idx_rolls_world on public.dice_rolls(world_id, created_at desc);
create index if not exists idx_journal_world on public.journal_entries(world_id, created_at desc);
create index if not exists idx_events_world on public.world_events(world_id, created_at desc);
create index if not exists idx_legacies_world on public.legacies(world_id);

-- --------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (solo clave anon, sin login: el juego se juega por
--    enlace; cada jugador se identifica por su nombre de jugador guardado
--    en su navegador. Las hojas caídas NO se pueden borrar: no hay política
--    de DELETE sobre characters.)
-- --------------------------------------------------------------------------

alter table public.worlds enable row level security;
alter table public.characters enable row level security;
alter table public.legacies enable row level security;
alter table public.adventures enable row level security;
alter table public.scenes enable row level security;
alter table public.enemies enable row level security;
alter table public.combat enable row level security;
alter table public.dice_rolls enable row level security;
alter table public.journal_entries enable row level security;
alter table public.world_events enable row level security;
alter table public.battle_maps enable row level security;

-- Lectura para todos los jugadores (anon)
do $$
declare t text;
begin
  for t in select unnest(array[
    'worlds','characters','legacies','adventures','scenes','enemies',
    'combat','dice_rolls','journal_entries','world_events','battle_maps'
  ]) loop
    execute format('drop policy if exists "lectura_juego" on public.%I', t);
    execute format('create policy "lectura_juego" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- Escritura (insert/update) para todos los jugadores (anon)
do $$
declare t text;
begin
  for t in select unnest(array[
    'worlds','characters','legacies','adventures','scenes','enemies',
    'combat','dice_rolls','journal_entries','world_events','battle_maps'
  ]) loop
    execute format('drop policy if exists "escritura_juego" on public.%I', t);
    execute format('create policy "escritura_juego" on public.%I for insert to anon, authenticated with check (true)', t);
    execute format('drop policy if exists "actualiza_juego" on public.%I', t);
    execute format('create policy "actualiza_juego" on public.%I for update to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Borrado: permitido en registro, crónica, eventos y mapas; PROHIBIDO en
-- personajes y legados (la muerte es permanente y el legado queda).
do $$
declare t text;
begin
  for t in select unnest(array[
    'dice_rolls','journal_entries','world_events','battle_maps','combat'
  ]) loop
    execute format('drop policy if exists "borrado_juego" on public.%I', t);
    execute format('create policy "borrado_juego" on public.%I for delete to anon, authenticated using (true)', t);
  end loop;
end $$;

-- --------------------------------------------------------------------------
-- 3. REALTIME (para que tiradas, iniciativa, PG y crónica se vean en vivo)
-- --------------------------------------------------------------------------

alter publication supabase_realtime add table public.worlds;
alter publication supabase_realtime add table public.characters;
alter publication supabase_realtime add table public.legacies;
alter publication supabase_realtime add table public.adventures;
alter publication supabase_realtime add table public.scenes;
alter publication supabase_realtime add table public.enemies;
alter publication supabase_realtime add table public.combat;
alter publication supabase_realtime add table public.dice_rolls;
alter publication supabase_realtime add table public.journal_entries;
alter publication supabase_realtime add table public.world_events;
alter publication supabase_realtime add table public.battle_maps;

-- --------------------------------------------------------------------------
-- 4. SEMILLA: un solo mundo persistente
-- --------------------------------------------------------------------------

insert into public.worlds (name, premise, law) values (
  'Journey to Hell',
  'Un solo mundo persistente, una escapatoria del mundo real. El mismo mundo, con diferentes lugares y aventuras. Cada quien tiene su propio personaje; si muere, empiezas de nuevo con otro, nunca el mismo, pero sus restos quedan en el mundo: tumbas, objetos, canciones y leyendas.',
  'LEY DEL MUNDO: la muerte es permanente. Cuando un personaje cae, su hoja queda sellada para siempre y su nombre no puede volver a usarse jamás. Lo que queda de él vive en "Restos y legado". El mundo sigue vivo entre sesiones: rumores, eventos y consecuencias.'
) on conflict do nothing;

-- --------------------------------------------------------------------------
-- 5. SEMILLA: las 9 aventuras (3 cortas, 3 medias, 3 largas de mundo vivo)
-- --------------------------------------------------------------------------

insert into public.adventures (world_id, name, duration, duration_label, description, open_ending, hooks, growth)
select id,
  'La taberna en llamas', 'corta', 'Corta · 1 hora',
  'Una taberna arde en plena noche y alguien dentro no quiere salir. ¿Rescate, incendio provocado o algo peor?',
  'El fuego se apaga, pero nadie sabe quién lo prendió. La taberna queda en pie, herida, y el culpable sigue suelto.',
  'El tabernero jura que vio una sombra con una lámpara. Una canción nueva se canta en la taberna: habla de ustedes.',
  'La taberna puede convertirse en la base del grupo: un hogar entre aventuras.'
from public.worlds where name = 'Journey to Hell'
on conflict (world_id, name) do nothing;

insert into public.adventures (world_id, name, duration, duration_label, description, open_ending, hooks, growth)
select id,
  'El goblin de la campana', 'corta', 'Corta · 1 hora',
  'Cada noche, a las doce, suena una campana que nadie toca. Un goblin la reclama como suya.',
  'La campana calla, pero el goblin deja una nota: "Volveré cuando la luna esté llena".',
  'El goblin robó algo pequeño de cada casa. Si lo devuelven, el pueblo les debe un favor.',
  'El goblin puede volver como aliado, informante o villano, según cómo lo trataron.'
from public.worlds where name = 'Journey to Hell'
on conflict (world_id, name) do nothing;

insert into public.adventures (world_id, name, duration, duration_label, description, open_ending, hooks, growth)
select id,
  'La cripta inundada', 'corta', 'Corta · 1 hora',
  'Bajo el cementerio, una cripta se llenó de agua negra. Algo brilla al fondo.',
  'Recuperan el objeto, pero el agua sigue subiendo. La cripta no se ha rendido.',
  'En la pared hay un nombre tachado: el de un héroe caído. Su historia no terminó.',
  'La cripta conecta con túneles más profundos: la puerta a una aventura mayor.'
from public.worlds where name = 'Journey to Hell'
on conflict (world_id, name) do nothing;

insert into public.adventures (world_id, name, duration, duration_label, description, open_ending, hooks, growth)
select id,
  'La mina de los ecos', 'media', 'Media · 2 a 3 horas',
  'Los mineros oyen sus propias voces repitiendo lo que aún no han dicho. La mina guarda un eco antiguo.',
  'La mina queda en silencio, pero un eco nuevo aparece: la voz de uno de ustedes.',
  'Un minero desaparecido dejó un diario. La última página está en blanco y se escribe sola.',
  'La mina esconde una veta de un metal que no debería existir: quien la controle, cambia el valle.'
from public.worlds where name = 'Journey to Hell'
on conflict (world_id, name) do nothing;

insert into public.adventures (world_id, name, duration, duration_label, description, open_ending, hooks, growth)
select id,
  'El circo de medianoche', 'media', 'Media · 2 a 3 horas',
  'Un circo llega sin avisar, solo de medianoche, y sus artistas no tienen sombra.',
  'El circo se va al amanecer, pero deja una carpa vacía. Dentro, un espejo muestra otra versión de ustedes.',
  'La domadora perdió a su mejor bestia: una sombra robada que ahora vaga libre.',
  'El circo volverá en la próxima luna llena, y esta vez traerá el espectáculo principal.'
from public.worlds where name = 'Journey to Hell'
on conflict (world_id, name) do nothing;

insert into public.adventures (world_id, name, duration, duration_label, description, open_ending, hooks, growth)
select id,
  'El faro sin luz', 'media', 'Media · 2 a 3 horas',
  'El faro lleva semanas apagado y los barcos se pierden. El farero no baja desde hace días.',
  'La luz vuelve, pero apunta hacia tierra, no hacia el mar. Alguien la está usando como señal.',
  'En la bitácora del faro, la última entrada es de mañana. Nadie la escribió todavía.',
  'El faro marca un camino que no está en ningún mapa: una ruta hacia lo que hay bajo el mar.'
from public.worlds where name = 'Journey to Hell'
on conflict (world_id, name) do nothing;

insert into public.adventures (world_id, name, duration, duration_label, description, open_ending, hooks, growth)
select id,
  'El valle que no duerme', 'larga', 'Larga · mundo vivo · hasta 8 horas',
  'Un valle donde nadie duerme desde hace un mes. Los sueños de todos se juntan en un solo sueño.',
  'El valle duerme por fin una noche… y sueña con ustedes. El primer arco termina, el mundo sigue.',
  'Tres facciones pelean por el valle: los que quieren dormir, los que venden sueños y los que ya no recuerdan cómo despertar.',
  'El valle es el corazón del mundo: lo que hagan aquí cambia las demás aventuras.'
from public.worlds where name = 'Journey to Hell'
on conflict (world_id, name) do nothing;

insert into public.adventures (world_id, name, duration, duration_label, description, open_ending, hooks, growth)
select id,
  'La ciudad bajo la montaña', 'larga', 'Larga · mundo vivo · hasta 8 horas',
  'Bajo la montaña hay una ciudad entera que el mapa olvidó. Sus calles siguen vivas y sus reyes, también.',
  'La ciudad abre sus puertas, pero solo una vez. Quien entra, queda marcado por la ciudad.',
  'El rey de la ciudad busca un heredero y los forasteros son candidatos. El precio es una memoria.',
  'La ciudad tiene distritos por descubrir: el mercado de los recuerdos, el barrio de los caídos y la torre sin escaleras.'
from public.worlds where name = 'Journey to Hell'
on conflict (world_id, name) do nothing;

insert into public.adventures (world_id, name, duration, duration_label, description, open_ending, hooks, growth)
select id,
  'El pacto del bosque antiguo', 'larga', 'Larga · mundo vivo · hasta 8 horas',
  'El bosque más viejo del mundo pide un pacto nuevo. Los árboles recuerdan el último, y no fue bueno.',
  'El pacto se firma, pero con una cláusula que nadie leyó: el bosque cobra en recuerdos.',
  'Un druida caído dejó su pacto a medias. Su espíritu sigue esperando a quien lo complete.',
  'El bosque crece con el grupo: cada sesión, un claro nuevo, un guardián nuevo, una deuda nueva.'
from public.worlds where name = 'Journey to Hell'
on conflict (world_id, name) do nothing;

-- --------------------------------------------------------------------------
-- 6. SEMILLA: escenas (3 por aventura) y enemigos precargados (2 por aventura)
-- --------------------------------------------------------------------------

-- La taberna en llamas
insert into public.scenes (adventure_id, position, place, narration)
select id, 1, 'La puerta de la taberna', 'Humo negro sale por la puerta de la taberna. Adentro se oyen gritos y el crujir de la madera. La gente del pueblo mira desde lejos, sin atreverse a entrar.'
from public.adventures where name = 'La taberna en llamas';
insert into public.scenes (adventure_id, position, place, narration)
select id, 2, 'La sala en llamas', 'Las mesas están volcadas y el fuego lame las vigas. En el fondo, una figura tose entre el humo: el tabernero, atrapado bajo una viga caída.'
from public.adventures where name = 'La taberna en llamas';
insert into public.scenes (adventure_id, position, place, narration)
select id, 3, 'La bodega', 'Bajo la taberna, la bodega está intacta… y huele a aceite. Alguien preparó este fuego. En la pared, una lámpara rota y huellas frescas hacia la salida trasera.'
from public.adventures where name = 'La taberna en llamas';
insert into public.enemies (adventure_id, name, hp, ac, attack_bonus, damage_dice)
select id, 'Bandido del fuego', 11, 12, 3, '1d6' from public.adventures where name = 'La taberna en llamas';
insert into public.enemies (adventure_id, name, hp, ac, attack_bonus, damage_dice)
select id, 'Perro asustado', 7, 12, 2, '1d4' from public.adventures where name = 'La taberna en llamas';

-- El goblin de la campana
insert into public.scenes (adventure_id, position, place, narration)
select id, 1, 'La plaza a medianoche', 'La plaza está vacía y la campana del templo cuelga inmóvil. De pronto suena: ¡dong! Nadie la tocó. Una risita se pierde entre los tejados.'
from public.adventures where name = 'El goblin de la campana';
insert into public.scenes (adventure_id, position, place, narration)
select id, 2, 'El campanario', 'Suben la escalera de caracol. Arriba, cuerdas cortadas, una bolsita de cosas robadas y huellas pequeñas que bajan por el tejado.'
from public.adventures where name = 'El goblin de la campana';
insert into public.scenes (adventure_id, position, place, narration)
select id, 3, 'La guarida del goblin', 'Bajo el puente, entre trastos, un goblin verde con una campanita en el cuello. "¡Mía!", dice, abrazando sus tesoros. No parece malo… solo solo.'
from public.adventures where name = 'El goblin de la campana';
insert into public.enemies (adventure_id, name, hp, ac, attack_bonus, damage_dice)
select id, 'Goblin travieso', 7, 13, 3, '1d6' from public.adventures where name = 'El goblin de la campana';
insert into public.enemies (adventure_id, name, hp, ac, attack_bonus, damage_dice)
select id, 'Rata de alcantarilla', 5, 11, 2, '1d4' from public.adventures where name = 'El goblin de la campana';

-- La cripta inundada
insert into public.scenes (adventure_id, position, place, narration)
select id, 1, 'La entrada del cementerio', 'La reja del cementerio está abierta. Las tumbas más viejas tienen flores frescas. Al fondo, unas escaleras bajan a la oscuridad y huele a agua estancada.'
from public.adventures where name = 'La cripta inundada';
insert into public.scenes (adventure_id, position, place, narration)
select id, 2, 'La cripta', 'El agua negra les llega a las rodillas. Las antorchas no prenden. Algo se mueve bajo el agua, y al fondo brilla una luz pequeña y dorada.'
from public.adventures where name = 'La cripta inundada';
insert into public.scenes (adventure_id, position, place, narration)
select id, 3, 'El sarcófago', 'En el centro, un sarcófago entreabierto. Dentro no hay huesos: hay un mapa, una espada vieja y un nombre tachado en la piedra.'
from public.adventures where name = 'La cripta inundada';
insert into public.enemies (adventure_id, name, hp, ac, attack_bonus, damage_dice)
select id, 'Esqueleto mojado', 13, 13, 3, '1d6' from public.adventures where name = 'La cripta inundada';
insert into public.enemies (adventure_id, name, hp, ac, attack_bonus, damage_dice)
select id, 'Rata gigante', 7, 12, 3, '1d4' from public.adventures where name = 'La cripta inundada';

-- La mina de los ecos
insert into public.scenes (adventure_id, position, place, narration)
select id, 1, 'La boca de la mina', 'La mina huele a polvo y a viejo. Un minero sale corriendo: "¡No entren! ¡Mi voz me está esperando adentro!".'
from public.adventures where name = 'La mina de los ecos';
insert into public.scenes (adventure_id, position, place, narration)
select id, 2, 'El túnel de los ecos', 'Cada paso suena dos veces. Sus propias voces repiten lo que acaban de decir… y luego lo que aún no han dicho.'
from public.adventures where name = 'La mina de los ecos';
insert into public.scenes (adventure_id, position, place, narration)
select id, 3, 'La veta imposible', 'Al fondo del túnel, una veta de metal negro brilla como un espejo. Refleja a cada uno, pero un poco distinto: más viejo, más cansado.'
from public.adventures where name = 'La mina de los ecos';
insert into public.enemies (adventure_id, name, hp, ac, attack_bonus, damage_dice)
select id, 'Eco hambriento', 15, 12, 3, '1d6' from public.adventures where name = 'La mina de los ecos';
insert into public.enemies (adventure_id, name, hp, ac, attack_bonus, damage_dice)
select id, 'Murciélago gigante', 10, 13, 3, '1d6' from public.adventures where name = 'La mina de los ecos';

-- El circo de medianoche
insert into public.scenes (adventure_id, position, place, narration)
select id, 1, 'El campo vacío', 'Al mediodía no hay nada. A medianoche, de la nada, aparecen carpas, luces y música. Un cartel dice: "Una sola función. No se admiten sombras".'
from public.adventures where name = 'El circo de medianoche';
insert into public.scenes (adventure_id, position, place, narration)
select id, 2, 'La carpa principal', 'El presentador no tiene sombra y sonríe demasiado. "¡Pasen, pasen! ¡El espectáculo es ustedes!". El público aplaude, pero nadie tiene cara.'
from public.adventures where name = 'El circo de medianoche';
insert into public.scenes (adventure_id, position, place, narration)
select id, 3, 'La jaula vacía', 'Detrás de las carpas, una jaula abierta. La domadora llora: su bestia, una sombra robada, escapó y ahora vaga por el pueblo buscando un cuerpo.'
from public.adventures where name = 'El circo de medianoche';
insert into public.enemies (adventure_id, name, hp, ac, attack_bonus, damage_dice)
select id, 'Sombra robada', 16, 12, 4, '1d6' from public.adventures where name = 'El circo de medianoche';
insert into public.enemies (adventure_id, name, hp, ac, attack_bonus, damage_dice)
select id, 'Payaso sin risa', 12, 12, 3, '1d6' from public.adventures where name = 'El circo de medianoche';

-- El faro sin luz
insert into public.scenes (adventure_id, position, place, narration)
select id, 1, 'El camino del acantilado', 'El viento pega fuerte y el mar ruge abajo. El faro se ve apagado contra el cielo gris. En el camino hay huellas que van… y no vuelven.'
from public.adventures where name = 'El faro sin luz';
insert into public.scenes (adventure_id, position, place, narration)
select id, 2, 'La puerta del faro', 'La puerta está entreabierta. Adentro huele a sal y a aceite quemado. La escalera sube en espiral y cada peldaño cruje con un nombre distinto.'
from public.adventures where name = 'El faro sin luz';
insert into public.scenes (adventure_id, position, place, narration)
select id, 3, 'La linterna', 'Arriba, la gran lámpara está fría. El farero está sentado, mirando el mar, sin moverse. En su bitácora, la última entrada es de mañana.'
from public.adventures where name = 'El faro sin luz';
insert into public.enemies (adventure_id, name, hp, ac, attack_bonus, damage_dice)
select id, 'Gaviota embrujada', 8, 13, 3, '1d4' from public.adventures where name = 'El faro sin luz';
insert into public.enemies (adventure_id, name, hp, ac, attack_bonus, damage_dice)
select id, 'Marinero ahogado', 14, 12, 3, '1d6' from public.adventures where name = 'El faro sin luz';

-- El valle que no duerme
insert into public.scenes (adventure_id, position, place, narration)
select id, 1, 'La entrada del valle', 'El valle está despierto a las tres de la mañana: luces en las ventanas, gente trabajando, niños jugando. Nadie ha dormido en un mes y nadie tiene sueño.'
from public.adventures where name = 'El valle que no duerme';
insert into public.scenes (adventure_id, position, place, narration)
select id, 2, 'El mercado de los sueños', 'Un mercado vende frascos con sueños: sueños de otros, sueños rotos, sueños que no son de nadie. El vendedor les ofrece el sueño de ustedes… que aún no han soñado.'
from public.adventures where name = 'El valle que no duerme';
insert into public.scenes (adventure_id, position, place, narration)
select id, 3, 'El sueño compartido', 'Al cerrar los ojos, todos sueñan lo mismo: un valle dormido, una puerta y una voz que dice "despiértenme". El sueño es el mapa.'
from public.adventures where name = 'El valle que no duerme';
insert into public.enemies (adventure_id, name, hp, ac, attack_bonus, damage_dice)
select id, 'Insomne furioso', 18, 13, 4, '1d8' from public.adventures where name = 'El valle que no duerme';
insert into public.enemies (adventure_id, name, hp, ac, attack_bonus, damage_dice)
select id, 'Pesadilla pequeña', 10, 12, 3, '1d6' from public.adventures where name = 'El valle que no duerme';

-- La ciudad bajo la montaña
insert into public.scenes (adventure_id, position, place, narration)
select id, 1, 'La puerta de piedra', 'La montaña se abre como una puerta. Adentro, una ciudad entera con luz de faroles y olor a pan. Nadie los esperaba, pero todos los conocen.'
from public.adventures where name = 'La ciudad bajo la montaña';
insert into public.scenes (adventure_id, position, place, narration)
select id, 2, 'El mercado de los recuerdos', 'Aquí se compran recuerdos con recuerdos. Un niño les ofrece su primer día de escuela a cambio de un recuerdo de ustedes. El mercado huele a infancia.'
from public.adventures where name = 'La ciudad bajo la montaña';
insert into public.scenes (adventure_id, position, place, narration)
select id, 3, 'El trono vacío', 'El rey de la ciudad busca heredero y los mira fijamente. "Los forasteros son candidatos", dice. El precio es una memoria, y el trono está vacío por una razón.'
from public.adventures where name = 'La ciudad bajo la montaña';
insert into public.enemies (adventure_id, name, hp, ac, attack_bonus, damage_dice)
select id, 'Guardia de piedra', 20, 15, 4, '1d8' from public.adventures where name = 'La ciudad bajo la montaña';
insert into public.enemies (adventure_id, name, hp, ac, attack_bonus, damage_dice)
select id, 'Ladrón de recuerdos', 12, 14, 4, '1d6' from public.adventures where name = 'La ciudad bajo la montaña';

-- El pacto del bosque antiguo
insert into public.scenes (adventure_id, position, place, narration)
select id, 1, 'El lindero', 'Los árboles viejos marcan el lindero con raíces como dedos. Al cruzar, el aire cambia: huele a lluvia vieja y el bosque los está mirando.'
from public.adventures where name = 'El pacto del bosque antiguo';
insert into public.scenes (adventure_id, position, place, narration)
select id, 2, 'El claro del pacto', 'En el centro del bosque, un claro redondo donde no crece nada. En el centro, una piedra con las huellas de un pacto roto y un nombre que se borró solo.'
from public.adventures where name = 'El pacto del bosque antiguo';
insert into public.scenes (adventure_id, position, place, narration)
select id, 3, 'El espíritu del druida', 'Un espíritu viejo, mitad hombre mitad árbol, los espera. "El pacto quedó a medias", dice. "Yo lo empecé. ¿Quién lo termina?"'
from public.adventures where name = 'El pacto del bosque antiguo';
insert into public.enemies (adventure_id, name, hp, ac, attack_bonus, damage_dice)
select id, 'Lobo de raíces', 16, 13, 4, '1d6' from public.adventures where name = 'El pacto del bosque antiguo';
insert into public.enemies (adventure_id, name, hp, ac, attack_bonus, damage_dice)
select id, 'Espina andante', 12, 13, 3, '1d6' from public.adventures where name = 'El pacto del bosque antiguo';

-- --------------------------------------------------------------------------
-- 7. COMPROBACIÓN RÁPIDA (corre estas consultas después de aplicar el SQL)
--    select count(*) from public.worlds;        -- debe dar 1
--    select count(*) from public.adventures;    -- debe dar 9
--    select count(*) from public.scenes;        -- debe dar 27
--    select count(*) from public.enemies;       -- debe dar 18
-- --------------------------------------------------------------------------
