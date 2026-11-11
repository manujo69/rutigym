import { Exercise, ExerciseGroup } from './models';

export const EXERCISES: readonly Exercise[] = [
  { id: 'core-plancha', name: 'Plancha abdominal', group: 'CORE' },
  { id: 'core-elevacion-piernas', name: 'Elevación de piernas', group: 'CORE' },
  { id: 'core-crunch-polea', name: 'Crunch en polea alta', group: 'CORE' },
  { id: 'core-rueda', name: 'Rueda abdominal', group: 'CORE' },
  { id: 'core-hollow', name: 'Hollow hold', group: 'CORE' },

  { id: 'piernas-sentadilla', name: 'Sentadilla con barra', group: 'PIERNAS' },
  { id: 'piernas-prensa', name: 'Prensa de piernas', group: 'PIERNAS' },
  { id: 'piernas-zancadas', name: 'Zancadas con mancuernas', group: 'PIERNAS' },
  { id: 'piernas-peso-muerto', name: 'Peso muerto rumano', group: 'PIERNAS' },
  { id: 'piernas-extension', name: 'Extensión de cuádriceps', group: 'PIERNAS' },
  { id: 'piernas-curl-femoral', name: 'Curl femoral tumbado', group: 'PIERNAS' },

  { id: 'brazos-curl-barra', name: 'Curl de bíceps con barra', group: 'BRAZOS' },
  { id: 'brazos-curl-martillo', name: 'Curl martillo', group: 'BRAZOS' },
  { id: 'brazos-press-frances', name: 'Press francés', group: 'BRAZOS' },
  { id: 'brazos-jalon-triceps', name: 'Jalón de tríceps en polea', group: 'BRAZOS' },
  { id: 'brazos-fondos', name: 'Fondos en paralelas', group: 'BRAZOS' },
];

export const GROUP_ORDER: readonly ExerciseGroup[] = ['CORE', 'PIERNAS', 'BRAZOS'];

export function exerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((exercise) => exercise.id === id);
}

export function exercisesOfGroup(group: ExerciseGroup): readonly Exercise[] {
  return EXERCISES.filter((exercise) => exercise.group === group);
}
