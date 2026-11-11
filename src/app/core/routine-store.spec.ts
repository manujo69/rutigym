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

  it('seeds a never-trained exercise with 10 reps and 20 kg', () => {
    store.savePlan(['tue']);
    store.addExercise('tue', 'piernas-sentadilla', 4);

    const sets = store.setsFor('tue', 'piernas-sentadilla');

    expect(sets.length).toBe(4);
    expect(sets.every((entry) => entry.reps === 10 && entry.kg === 20 && !entry.done)).toBeTrue();
  });

  it('seeds a new session with the last values logged for that exercise', () => {
    store.savePlan(['mon', 'wed']);
    store.addExercise('mon', 'core-plancha', 2);
    store.addExercise('wed', 'core-plancha', 2);
    store.saveSets('mon', 'core-plancha', [
      { reps: 14, kg: 32.5, done: true },
      { reps: 12, kg: 30, done: true },
    ]);

    const sets = store.setsFor('wed', 'core-plancha');

    expect(sets.map((entry) => ({ reps: entry.reps, kg: entry.kg }))).toEqual([
      { reps: 12, kg: 30 },
      { reps: 12, kg: 30 },
    ]);
  });

  it('allows extra series beyond the configured ones and keeps them', () => {
    store.savePlan(['mon']);
    store.addExercise('mon', 'core-plancha', 2);

    store.addSeries('mon', 'core-plancha');
    store.addSeries('mon', 'core-plancha');

    expect(store.setsFor('mon', 'core-plancha').length).toBe(4);
    expect(store.seriesFor('mon', 'core-plancha')).toBe(2);
    expect(store.progressFor('mon', 'core-plancha')).toEqual({ done: 0, total: 4 });

    store.saveSets('mon', 'core-plancha', [
      { reps: 10, kg: 20, done: true },
      { reps: 10, kg: 20, done: true },
      { reps: 10, kg: 20, done: true },
      { reps: 10, kg: 20, done: true },
    ]);

    const reloaded = TestBed.runInInjectionContext(() => new RoutineStore());
    expect(reloaded.setsFor('mon', 'core-plancha').length).toBe(4);
    expect(reloaded.progressFor('mon', 'core-plancha')).toEqual({ done: 4, total: 4 });
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

  describe('workout history', () => {
    const wednesday = new Date(2026, 10, 11);

    it('records a dated session with the weights and reps of every series', () => {
      store.savePlan(['wed']);
      store.addExercise('wed', 'piernas-prensa', 2);
      store.saveSets('wed', 'piernas-prensa', [
        { reps: 12, kg: 80, done: true },
        { reps: 10, kg: 85, done: false },
      ]);

      store.finishDay('wed', wednesday);

      const sessions = store.sessions();

      expect(sessions.length).toBe(1);
      expect(sessions[0].date).toBe('2026-11-11');
      expect(sessions[0].day).toBe('wed');
      expect(sessions[0].exercises).toEqual([
        {
          exerciseId: 'piernas-prensa',
          sets: [
            { reps: 12, kg: 80, done: true },
            { reps: 10, kg: 85, done: false },
          ],
        },
      ]);
    });

    it('does not record a session when nothing was completed', () => {
      store.savePlan(['wed']);
      store.addExercise('wed', 'piernas-prensa', 2);

      store.finishDay('wed', wednesday);

      expect(store.sessions()).toEqual([]);
    });

    it('clears only the active log of the finished day', () => {
      store.savePlan(['mon', 'wed']);
      store.addExercise('mon', 'core-plancha', 1);
      store.addExercise('wed', 'piernas-prensa', 1);
      store.saveSets('mon', 'core-plancha', [{ reps: 12, kg: 0, done: true }]);
      store.saveSets('wed', 'piernas-prensa', [{ reps: 10, kg: 70, done: true }]);

      store.finishDay('wed', wednesday);

      expect(store.setsFor('wed', 'piernas-prensa').every((entry) => !entry.done)).toBeTrue();
      expect(store.setsFor('mon', 'core-plancha').some((entry) => entry.done)).toBeTrue();
    });

    it('marks completed, planned and rest days of the current week', () => {
      store.savePlan(['mon', 'wed', 'fri']);
      store.ensureDemoHistory(wednesday);

      const week = store.weekOverview(wednesday);

      expect(week.map((day) => day.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(week[0].state).toBe('done');
      expect(week[1].state).toBe('rest');
      expect(week[2].state).toBe('done');
      expect(week[4].state).toBe('planned');
      expect(week[5].state).toBe('rest');
      expect(week[0].label).toBeTruthy();
    });

    it('seeds a demo week only when there is no history', () => {
      store.ensureDemoHistory(wednesday);
      const seeded = store.sessions();

      expect(seeded.length).toBe(5);
      expect(seeded.every((session) => session.demo)).toBeTrue();

      store.ensureDemoHistory(wednesday);
      expect(store.sessions().length).toBe(5);
    });

    it('removes the demo sessions but keeps real ones', () => {
      store.ensureDemoHistory(wednesday);
      store.savePlan(['wed']);
      store.addExercise('wed', 'piernas-prensa', 1);
      store.saveSets('wed', 'piernas-prensa', [{ reps: 10, kg: 70, done: true }]);
      store.finishDay('wed', wednesday);

      store.clearDemoSessions();

      expect(store.sessions().length).toBe(1);
      expect(store.sessions()[0].demo).toBeFalsy();

      store.ensureDemoHistory(wednesday);
      expect(store.sessions().length).toBe(1);
    });
  });
});
