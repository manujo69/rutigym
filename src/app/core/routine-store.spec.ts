import { TestBed } from '@angular/core/testing';

import { RoutineStore } from './routine-store';

function ids(entries: readonly { exerciseId: string }[]): string[] {
  return entries.map((entry) => entry.exerciseId);
}

describe('RoutineStore', () => {
  let store: RoutineStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(RoutineStore);
  });

  afterEach(() => localStorage.clear());

  it('labels the configured days as LUNES, MIÉRCOLES y VIERNES', () => {
    store.savePlan(['mon', 'wed', 'fri']);

    expect(store.hasPlan()).toBeTrue();
    expect(store.daysLabel()).toBe('LUNES, MIÉRCOLES y VIERNES');
  });

  it('starts every configured day with an empty routine', () => {
    store.savePlan(['mon', 'wed']);

    expect(store.routinesFor('mon')).toEqual([]);
    expect(store.routinesFor('wed')).toEqual([]);
    expect(store.totalExercises()).toBe(0);
  });

  it('keeps the routine of each day independent', () => {
    store.savePlan(['mon', 'wed']);
    store.addExercise('mon', 'piernas-sentadilla');
    store.addExercise('mon', 'core-plancha');
    store.addExercise('wed', 'brazos-curl-barra');

    expect(ids(store.routinesFor('mon'))).toEqual(['piernas-sentadilla', 'core-plancha']);
    expect(ids(store.routinesFor('wed'))).toEqual(['brazos-curl-barra']);
  });

  it('adds an exercise only once, with the default series', () => {
    store.savePlan(['mon']);
    store.addExercise('mon', 'core-plancha');
    store.addExercise('mon', 'core-plancha');

    expect(ids(store.routinesFor('mon'))).toEqual(['core-plancha']);
    expect(store.seriesFor('mon', 'core-plancha')).toBe(3);
    expect(store.isPlanned('mon', 'core-plancha')).toBeTrue();
  });

  it('updates the series and removes a planned exercise', () => {
    store.savePlan(['mon']);
    store.addExercise('mon', 'core-plancha');

    store.setSeries('mon', 'core-plancha', 5);
    expect(store.seriesFor('mon', 'core-plancha')).toBe(5);

    store.removeExercise('mon', 'core-plancha');
    expect(store.isPlanned('mon', 'core-plancha')).toBeFalse();
    expect(store.routinesFor('mon')).toEqual([]);
  });

  it('persists the routines of every day across store instances', () => {
    store.savePlan(['mon', 'fri']);
    store.addExercise('mon', 'core-plancha', 4);
    store.addExercise('fri', 'piernas-prensa', 2);

    const reloaded = TestBed.runInInjectionContext(() => new RoutineStore());

    expect(reloaded.days()).toEqual(['mon', 'fri']);
    expect(ids(reloaded.routinesFor('mon'))).toEqual(['core-plancha']);
    expect(reloaded.seriesFor('mon', 'core-plancha')).toBe(4);
    expect(ids(reloaded.routinesFor('fri'))).toEqual(['piernas-prensa']);
  });

  it('creates one empty entry per configured series for that day', () => {
    store.savePlan(['tue']);
    store.addExercise('tue', 'piernas-sentadilla', 4);

    const sets = store.setsFor('tue', 'piernas-sentadilla');

    expect(sets.length).toBe(4);
    expect(sets.every((entry) => entry.reps === null && entry.kg === null && !entry.done)).toBeTrue();
  });

  it('reports progress per exercise and across the day routine', () => {
    store.savePlan(['mon']);
    store.addExercise('mon', 'core-plancha', 3);
    store.addExercise('mon', 'piernas-prensa', 2);
    store.saveSets('mon', 'core-plancha', [
      { reps: 12, kg: 0, done: true },
      { reps: 12, kg: 0, done: true },
      { reps: 10, kg: 0, done: false },
    ]);

    expect(store.progressFor('mon', 'core-plancha')).toEqual({ done: 2, total: 3 });
    expect(store.dayProgressFor('mon')).toEqual({ done: 2, total: 5 });
  });

  it('clears one day routine without touching the other days', () => {
    store.savePlan(['mon', 'wed']);
    store.addExercise('mon', 'core-plancha');
    store.addExercise('wed', 'brazos-curl-barra');

    store.clearDayRoutine('mon');

    expect(store.routinesFor('mon')).toEqual([]);
    expect(ids(store.routinesFor('wed'))).toEqual(['brazos-curl-barra']);
    expect(store.hasPlan()).toBeTrue();
  });

  it('clears the configured plan but keeps the logged history', () => {
    store.savePlan(['fri']);
    store.addExercise('fri', 'piernas-prensa', 3);
    store.saveSets('fri', 'piernas-prensa', [{ reps: 10, kg: 80, done: true }]);

    store.clearPlan();

    expect(store.hasPlan()).toBeFalse();
    expect(store.daysLabel()).toBe('');
    expect(store.totalExercises()).toBe(0);
    expect(store.setsFor('fri', 'piernas-prensa')[0]).toEqual({ reps: 10, kg: 80, done: true });
  });

  it('keeps the stored routine when a day leaves the plan and comes back', () => {
    store.savePlan(['mon', 'wed']);
    store.addExercise('wed', 'piernas-prensa', 4);

    store.savePlan(['mon']);
    expect(store.days()).toEqual(['mon']);

    store.savePlan(['mon', 'wed']);
    expect(ids(store.routinesFor('wed'))).toEqual(['piernas-prensa']);
    expect(store.seriesFor('wed', 'piernas-prensa')).toBe(4);
  });
});
