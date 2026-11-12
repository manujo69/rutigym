import { Exercise, ExerciseGroup } from './models';

export const EXERCISES: readonly Exercise[] = [
  {
    id: 'core-plancha',
    name: 'Plancha abdominal',
    group: 'CORE',
    image: '/exercises/floor-mat.webp',
  },
  {
    id: 'core-elevacion-piernas',
    name: 'Elevación de piernas',
    group: 'CORE',
    image: '/exercises/flat-bench.webp',
  },
  {
    id: 'core-crunch-polea',
    name: 'Crunch en polea alta',
    group: 'CORE',
    image: '/exercises/multi-gym.webp',
  },
  {
    id: 'core-crunch-maquina',
    name: 'Crunch en máquina',
    group: 'CORE',
    image: '/exercises/crunch-machine.webp',
  },
  {
    id: 'core-rueda',
    name: 'Rueda abdominal',
    group: 'CORE',
    image: '/exercises/floor-mat.webp',
  },
  {
    id: 'core-hollow',
    name: 'Hollow hold',
    group: 'CORE',
    image: '/exercises/floor-mat.webp',
  },
  {
    id: 'core-press-pallof',
    name: 'Press Pallof',
    group: 'CORE',
    image: '/exercises/multi-gym.webp',
  },
  {
    id: 'core-dead-bug',
    name: 'Dead bug',
    group: 'CORE',
    image: '/exercises/floor-mat.webp',
  },
  { id: 'core-contractora', name: 'Aperturas en contractora', group: 'CORE', image: '/exercises/butterfly.webp' },
  { id: 'core-press-pecho', name: 'Press de pecho en máquina', group: 'CORE', image: '/exercises/chest-press.webp' },
  {
    id: 'core-press-banca',
    name: 'Press de banca plano',
    group: 'CORE',
    image: '/exercises/flat-bench.webp',
  },

  {
    id: 'piernas-sentadilla',
    name: 'Sentadilla con barra',
    group: 'PIERNAS',
    image: '/exercises/floor-mat.webp',
  },
  { id: 'piernas-prensa', name: 'Prensa de piernas', group: 'PIERNAS', image: '/exercises/leg-press.webp' },
  {
    id: 'piernas-zancadas',
    name: 'Zancadas con mancuernas',
    group: 'PIERNAS',
    image: '/exercises/dumbbell-rack.webp',
  },
  {
    id: 'piernas-peso-muerto',
    name: 'Peso muerto rumano',
    group: 'PIERNAS',
    image: '/exercises/dumbbell-rack.webp',
  },
  { id: 'piernas-extension', name: 'Extensión de cuádriceps', group: 'PIERNAS', image: '/exercises/leg-extension.webp' },
  {
    id: 'piernas-curl-femoral',
    name: 'Curl femoral de pie',
    group: 'PIERNAS',
    image: '/exercises/leg-curl.webp',
  },
  {
    id: 'piernas-curl-femoral-tumbado',
    name: 'Curl femoral tumbado',
    group: 'PIERNAS',
    image: '/exercises/lying-leg-curl.webp',
  },
  { id: 'piernas-abduccion', name: 'Abducción de cadera en máquina', group: 'PIERNAS', image: '/exercises/hip-abduction.webp' },
  { id: 'piernas-cadera', name: 'Extensión de cadera en máquina', group: 'PIERNAS', image: '/exercises/hip-extension.webp' },
  {
    id: 'piernas-talones',
    name: 'Elevación de talones de pie',
    group: 'PIERNAS',
    image: '/exercises/hip-extension.webp',
  },

  { id: 'brazos-curl-barra', name: 'Curl de bíceps con barra', group: 'BRAZOS', image: '/exercises/preacher-curl.webp' },
  {
    id: 'brazos-curl-mancuernas',
    name: 'Curl de bíceps con mancuernas',
    group: 'BRAZOS',
    image: '/exercises/dumbbell-rack.webp',
  },
  {
    id: 'brazos-curl-martillo',
    name: 'Curl martillo',
    group: 'BRAZOS',
    image: '/exercises/dumbbell-rack.webp',
  },
  {
    id: 'brazos-press-frances',
    name: 'Press francés',
    group: 'BRAZOS',
    image: '/exercises/flat-bench.webp',
  },
  { id: 'brazos-jalon-triceps', name: 'Pulldown de tríceps en polea', group: 'BRAZOS', image: '/exercises/triceps-pushdown.webp' },
  {
    id: 'brazos-fondos',
    name: 'Fondos en paralelas',
    group: 'BRAZOS',
    image: '/exercises/dip-station.webp',
  },
  { id: 'brazos-press-hombros', name: 'Press de hombros en máquina', group: 'BRAZOS', image: '/exercises/shoulder-press.webp' },
  { id: 'brazos-deltoides-posterior', name: 'Deltoides posterior en máquina', group: 'BRAZOS', image: '/exercises/rear-delt.webp' },
  {
    id: 'brazos-elevaciones-laterales',
    name: 'Elevaciones laterales en máquina',
    group: 'BRAZOS',
    image: '/exercises/lateral-raise.webp',
  },

  { id: 'espalda-jalon-pecho', name: 'Pulldown al pecho', group: 'ESPALDA', image: '/exercises/lat-pulley.webp' },
  { id: 'espalda-remo-sentado', name: 'Remo sentado', group: 'ESPALDA', image: '/exercises/multi-gym.webp' },
  {
    id: 'espalda-remo-mancuerna',
    name: 'Remo a una mano',
    group: 'ESPALDA',
    image: '/exercises/seated-row.webp',
  },
  {
    id: 'espalda-dominadas',
    name: 'Dominadas',
    group: 'ESPALDA',
    image: '/exercises/multi-gym.webp',
  },
  {
    id: 'espalda-hiperextensiones',
    name: 'Hiperextensiones',
    group: 'ESPALDA',
    image: '/exercises/multi-gym.webp',
  },
];

export const GROUP_ORDER: readonly ExerciseGroup[] = ['CORE', 'PIERNAS', 'BRAZOS', 'ESPALDA'];

export function exerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((exercise) => exercise.id === id);
}

export function exercisesOfGroup(group: ExerciseGroup): readonly Exercise[] {
  return EXERCISES.filter((exercise) => exercise.group === group);
}
