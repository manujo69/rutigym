import { WorkoutSession } from './models';
import {
  bestSetIndex,
  exerciseHistory,
  hasPreviousSession,
  oneRepMax,
  sessionRecords,
  sessionVolume,
} from './session-stats';

function session(
  id: string,
  date: string,
  exercises: Array<[string, Array<[number, number, boolean]>]>,
): WorkoutSession {
  return {
    id,
    date,
    day: 'wed',
    exercises: exercises.map(([exerciseId, sets]) => ({
      exerciseId,
      sets: sets.map(([reps, kg, done]) => ({ reps, kg, done })),
    })),
  };
}

const first = session('a', '2026-11-12', [
  ['jalon', [
    [12, 35, true],
    [12, 30, true],
    [12, 35, true],
  ]],
]);
const second = session('b', '2026-11-18', [
  ['jalon', [
    [12, 35, true],
    [12, 35, true],
    [10, 42.5, true],
  ]],
  ['nuevo', [
    [10, 20, true],
  ]],
]);

describe('session-stats', () => {
  it('estimates 1 RM with Epley and ignores bodyweight sets', () => {
    expect(oneRepMax(42.5, 10)).toBeCloseTo(56.67, 1);
    expect(oneRepMax(0, 20)).toBe(0);
    expect(oneRepMax(30, 0)).toBe(0);
  });

  it('adds up the volume of the performed sets with weight', () => {
    expect(sessionVolume(first)).toBe(1200);
    expect(sessionVolume(second)).toBe(1265 + 200);
  });

  it('picks the set with the best 1 RM, first one on a tie', () => {
    expect(bestSetIndex(first.exercises[0].sets)).toBe(1);
    expect(bestSetIndex(second.exercises[0].sets)).toBe(3);
    expect(bestSetIndex([])).toBe(0);
  });

  it('builds the history of an exercise from oldest to newest', () => {
    const history = exerciseHistory([second, first], 'jalon');

    expect(history.map((entry) => entry.date)).toEqual(['2026-11-12', '2026-11-18']);
    expect(history[1].bestIndex).toBe(3);
    expect(history[1].bestRm).toBeCloseTo(56.67, 1);
    expect(history[1].volume).toBe(1265);
  });

  it('marks a record only when a previous record exists to beat', () => {
    const badges = sessionRecords(second, [first]);

    expect(badges.get('jalon')).toEqual({ setIndex: 3, rm: jasmine.any(Number), previousRm: jasmine.any(Number) });
    expect(badges.get('jalon')?.previousRm).toBeCloseTo(49, 1);
    expect(badges.has('nuevo')).toBeFalse();
  });

  it('does not mark anything when the best set does not improve', () => {
    const badges = sessionRecords(first, [second]);
    expect(badges.has('jalon')).toBeFalse();
  });

  it('knows whether there is a previous session to compare with', () => {
    expect(hasPreviousSession([first], 'jalon')).toBeTrue();
    expect(hasPreviousSession([first], 'nuevo')).toBeFalse();
  });
});
