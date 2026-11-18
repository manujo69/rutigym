/**
 * Visible names of the diagram regions. The keys are the `data-muscle` values of
 * `public/muscles/*.svg`, so a region and its label can never drift apart silently.
 */
export const MUSCLE_NAMES: Readonly<Record<string, string>> = {
  abdominales: 'Abdominales',
  antebrazos: 'Antebrazos',
  biceps: 'Bíceps',
  cuadriceps: 'Cuádriceps',
  'deltoides frontales': 'Deltoides anterior',
  'deltoides posteriores': 'Deltoides posterior',
  dorsales: 'Dorsales',
  gemelos: 'Gemelos',
  gluteos: 'Glúteos',
  isquiotibiales: 'Isquiotibiales',
  lumbares: 'Lumbares',
  oblicuos: 'Oblicuos',
  pecho: 'Pectorales',
  trapecios: 'Trapecios',
  triceps: 'Tríceps',
};

/** Visible name of a diagram muscle; falls back to a capitalised identifier. */
export function muscleName(muscle: string): string {
  return MUSCLE_NAMES[muscle] ?? muscle.charAt(0).toUpperCase() + muscle.slice(1);
}
