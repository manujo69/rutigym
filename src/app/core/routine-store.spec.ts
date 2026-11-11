import { TestBed } from '@angular/core/testing';

import { RoutineStore } from './routine-store';

describe('RoutineStore', () => {
  let store: RoutineStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(RoutineStore);
  });

  afterEach(() => localStorage.clear());

  it('labels the configured days as LUNES, MIÉRCOLES y VIERNES', () => {
    store.savePlan(['mon', 'wed', 'fri'], { 'core-plancha': 3 });

    expect(store.hasPlan()).toBeTrue();
    expect(store.daysLabel()).toBe('LUNES, MIÉRCOLES y VIERNES');
  });

  it('persists the plan so a new store instance reads it back', () => {
    store.savePlan(['tue'], { 'brazos-curl-barra': 4 });

    const reloaded = TestBed.runInInjectionContext(() => new RoutineStore());

    expect(reloaded.hasPlan()).toBeTrue();
    expect(reloaded.days()).toEqual(['tue']);
    expect(reloaded.seriesFor('brazos-curl-barra')).toBe(4);
  });

  it('clears the configured plan but keeps the logged history', () => {
    store.savePlan(['fri'], { 'piernas-prensa': 3 });
    store.saveSets('fri', 'piernas-prensa', [{ reps: 10, kg: 80, done: true }]);

    store.clearPlan();

    expect(store.hasPlan()).toBeFalse();
    expect(store.daysLabel()).toBe('');
    expect(store.setsFor('fri', 'piernas-prensa')[0]).toEqual({ reps: 10, kg: 80, done: true });
  });

  it('creates one empty entry per configured series', () => {
    store.savePlan(['mon'], { 'piernas-sentadilla': 4 });

    const sets = store.setsFor('mon', 'piernas-sentadilla');

    expect(sets.length).toBe(4);
    expect(sets.every((entry) => entry.reps === null && entry.kg === null && !entry.done)).toBeTrue();
  });

  it('reports how many series are already recorded for an exercise', () => {
    store.savePlan(['mon'], { 'core-plancha': 3 });
    store.saveSets('mon', 'core-plancha', [
      { reps: 12, kg: 0, done: true },
      { reps: 12, kg: 0, done: true },
      { reps: 10, kg: 0, done: false },
    ]);

    expect(store.progressFor('mon', 'core-plancha')).toEqual({ done: 2, total: 3 });
  });

  it('reports the whole-day progress across every planned exercise', () => {
    store.savePlan(['mon'], { 'core-plancha': 2, 'piernas-prensa': 3 });
    store.saveSets('mon', 'core-plancha', [
      { reps: 12, kg: 0, done: true },
      { reps: 12, kg: 0, done: true },
    ]);

    const progress = store.dayProgressFor('mon');

    expect(progress.done).toBe(2);
    expect(progress.total).toBe(store.totalSeries());
  });
});
