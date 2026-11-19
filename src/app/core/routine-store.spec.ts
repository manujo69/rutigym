import { TestBed } from '@angular/core/testing';

import { MemoryRoutineRepository } from './data/memory-routine.repository';
import { ROUTINE_REPOSITORY } from './data/routine.repository';
import { RoutineStore } from './routine-store';

function ids(entries: readonly { exerciseId: string }[]): string[] {
  return entries.map((entry) => entry.exerciseId);
}

describe('RoutineStore', () => {
  let store: RoutineStore;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: ROUTINE_REPOSITORY, useClass: MemoryRoutineRepository }],
    });
    store = TestBed.inject(RoutineStore);
    await store.init();
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

  it('persists the routines of every day across store instances', async () => {
    store.savePlan(['mon', 'fri']);
    store.addExercise('mon', 'core-plancha', 4);
    store.addExercise('fri', 'piernas-prensa', 2);

    const reloaded = TestBed.runInInjectionContext(() => new RoutineStore());
    await reloaded.init();

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

  it('seeds every series with the values of the same series in the last recorded session', () => {
    store.savePlan(['mon', 'wed']);
    store.addExercise('mon', 'core-plancha', 2);
    store.addExercise('wed', 'core-plancha', 2);
    store.saveSets('mon', 'core-plancha', [
      { reps: 14, kg: 32.5, done: true },
      { reps: 12, kg: 30, done: true },
    ]);

    const sets = store.setsFor('wed', 'core-plancha');

    expect(sets.map((entry) => ({ reps: entry.reps, kg: entry.kg }))).toEqual([
      { reps: 14, kg: 32.5 },
      { reps: 12, kg: 30 },
    ]);
    expect(sets.every((entry) => !entry.done)).toBeTrue();
  });

  it('seeds a new workout with the series of the last finished session', async () => {
    store.savePlan(['wed']);
    store.addExercise('wed', 'piernas-prensa', 3);
    store.saveSets('wed', 'piernas-prensa', [
      { reps: 12, kg: 80, done: true },
      { reps: 10, kg: 85, done: true },
      { reps: 8, kg: 90, done: true },
    ]);
    store.finishDay('wed', new Date(2026, 10, 11));

    await TestBed.inject(ROUTINE_REPOSITORY).setMeta('logs_week', '2026-10-26');
    const reloaded = TestBed.runInInjectionContext(() => new RoutineStore());
    await reloaded.init();

    const sets = reloaded.setsFor('wed', 'piernas-prensa');

    expect(sets.map((entry) => ({ reps: entry.reps, kg: entry.kg, done: entry.done }))).toEqual([
      { reps: 12, kg: 80, done: false },
      { reps: 10, kg: 85, done: false },
      { reps: 8, kg: 90, done: false },
    ]);
  });

  it('seeds from the newest session that recorded the exercise', async () => {
    store.savePlan(['wed']);
    store.addExercise('wed', 'piernas-prensa', 1);
    store.saveSets('wed', 'piernas-prensa', [{ reps: 12, kg: 70, done: true }]);
    store.finishDay('wed', new Date(2026, 10, 4));
    store.saveSets('wed', 'piernas-prensa', [{ reps: 10, kg: 90, done: true }]);
    store.finishDay('wed', new Date(2026, 10, 11));

    // Con los registros activos todavía en pantalla no hay siembra; la semana siguiente sí.
    await TestBed.inject(ROUTINE_REPOSITORY).setMeta('logs_week', '2026-10-26');
    const reloaded = TestBed.runInInjectionContext(() => new RoutineStore());
    await reloaded.init();

    expect(reloaded.setsFor('wed', 'piernas-prensa')[0]).toEqual({
      reps: 10,
      kg: 90,
      done: false,
    });
  });

  it('repeats the last recorded series when the plan asks for more series', () => {
    store.savePlan(['wed']);
    store.addExercise('wed', 'piernas-prensa', 2);
    store.saveSets('wed', 'piernas-prensa', [
      { reps: 12, kg: 80, done: true },
      { reps: 10, kg: 85, done: true },
    ]);
    store.finishDay('wed', new Date(2026, 10, 11));

    store.setSeries('wed', 'piernas-prensa', 4);

    expect(
      store.setsFor('wed', 'piernas-prensa').map((entry) => ({ reps: entry.reps, kg: entry.kg })),
    ).toEqual([
      { reps: 12, kg: 80 },
      { reps: 10, kg: 85 },
      { reps: 10, kg: 85 },
      { reps: 10, kg: 85 },
    ]);
  });

  it('copies the weight of a series to the following pending series', () => {
    store.savePlan(['mon']);
    store.addExercise('mon', 'core-plancha', 3);

    store.updateSet('mon', 'core-plancha', 0, { kg: 30 });

    expect(store.setsFor('mon', 'core-plancha').map((entry) => entry.kg)).toEqual([30, 30, 30]);
  });

  it('copies the reps of a series to the following pending series', () => {
    store.savePlan(['mon']);
    store.addExercise('mon', 'core-plancha', 3);

    store.updateSet('mon', 'core-plancha', 0, { reps: 12 });

    expect(store.setsFor('mon', 'core-plancha').map((entry) => entry.reps)).toEqual([12, 12, 12]);
  });

  it('only copies the values that changed', () => {
    store.savePlan(['mon']);
    store.addExercise('mon', 'core-plancha', 2);
    store.saveSets('mon', 'core-plancha', [
      { reps: 8, kg: 20, done: false },
      { reps: 12, kg: 20, done: false },
    ]);

    store.updateSet('mon', 'core-plancha', 0, { kg: 30 });

    expect(
      store.setsFor('mon', 'core-plancha').map((entry) => ({ reps: entry.reps, kg: entry.kg })),
    ).toEqual([
      { reps: 8, kg: 30 },
      { reps: 12, kg: 30 },
    ]);
  });

  it('keeps a completed series with the values it was logged with', () => {
    store.savePlan(['mon']);
    store.addExercise('mon', 'core-plancha', 3);
    store.saveSets('mon', 'core-plancha', [
      { reps: 10, kg: 30, done: true },
      { reps: 10, kg: 20, done: true },
      { reps: 10, kg: 20, done: false },
    ]);

    store.updateSet('mon', 'core-plancha', 0, { kg: 25 });

    expect(store.setsFor('mon', 'core-plancha').map((entry) => entry.kg)).toEqual([25, 20, 25]);
  });

  it('does not copy a change to the series before it', () => {
    store.savePlan(['mon']);
    store.addExercise('mon', 'core-plancha', 3);

    store.updateSet('mon', 'core-plancha', 2, { kg: 40 });

    expect(store.setsFor('mon', 'core-plancha').map((entry) => entry.kg)).toEqual([20, 20, 40]);
  });

  it('ignores the demo history when seeding a real workout', () => {
    store.ensureDemoHistory(new Date(2026, 10, 11));
    store.savePlan(['wed']);
    store.addExercise('wed', 'piernas-prensa', 3);

    const sets = store.setsFor('wed', 'piernas-prensa');

    expect(sets.every((entry) => entry.reps === 10 && entry.kg === 20)).toBeTrue();
  });

  it('allows extra series beyond the configured ones and keeps them', async () => {
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
    await reloaded.init();
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

    it('keeps the active log after finishing the day', () => {
      store.savePlan(['mon', 'wed']);
      store.addExercise('mon', 'core-plancha', 1);
      store.addExercise('wed', 'piernas-prensa', 1);
      store.saveSets('mon', 'core-plancha', [{ reps: 12, kg: 0, done: true }]);
      store.saveSets('wed', 'piernas-prensa', [{ reps: 10, kg: 70, done: true }]);

      store.finishDay('wed', wednesday);

      expect(store.setsFor('wed', 'piernas-prensa')[0]).toEqual({ reps: 10, kg: 70, done: true });
      expect(store.setsFor('mon', 'core-plancha').some((entry) => entry.done)).toBeTrue();
    });

    it('clears the active logs when the calendar moves to another week', async () => {
      store.savePlan(['mon', 'wed']);
      store.addExercise('wed', 'piernas-prensa', 1);
      store.saveSets('wed', 'piernas-prensa', [{ reps: 10, kg: 70, done: true }]);

      const repository = TestBed.inject(ROUTINE_REPOSITORY);
      await repository.setMeta('logs_week', '2026-10-26');

      const reloaded = TestBed.runInInjectionContext(() => new RoutineStore());
      await reloaded.init();

      expect(reloaded.setsFor('wed', 'piernas-prensa')[0].done).toBeFalse();
      expect(reloaded.setsFor('wed', 'piernas-prensa')[0].kg).toBe(70);
      expect(reloaded.sessions().some((session) => session.date === '2026-10-28')).toBeTrue();
    });

    it('marks completed, planned and rest days of the current week', () => {
      store.savePlan(['mon', 'wed', 'fri']);
      store.ensureDemoHistory(wednesday);

      const week = store.weekOverview(wednesday);

      expect(week.map((day) => day.letter)).toEqual(['L', 'M', 'X', 'J', 'V', 'S', 'D']);
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

  describe('backup', () => {
    const backup = {
      app: 'rutigym',
      version: 1,
      exportedAt: '2026-11-12T10:00:00.000Z',
      days: ['tue'],
      routines: { tue: [{ exerciseId: 'espalda-dominadas', series: 5 }] },
      logs: { tue: { 'espalda-dominadas': [{ reps: 8, kg: 10, done: true }] } },
      lastValues: { 'espalda-dominadas': { reps: 8, kg: 10 } },
      sessions: [],
    };

    it('replaces the plan with an imported copy', async () => {
      store.savePlan(['mon']);

      const result = await store.importBackup(JSON.stringify(backup));

      expect(result.ok).toBeTrue();
      expect(store.days()).toEqual(['tue']);
      expect(ids(store.routinesFor('tue'))).toEqual(['espalda-dominadas']);
      expect(store.setsFor('tue', 'espalda-dominadas').length).toBe(5);
      expect(store.setsFor('tue', 'espalda-dominadas')[0].done).toBeTrue();
    });

    it('keeps the current plan when the copy is invalid', async () => {
      store.savePlan(['mon']);

      const result = await store.importBackup('{ roto');

      expect(result.ok).toBeFalse();
      expect(store.days()).toEqual(['mon']);
    });

    it('exports what it imported', async () => {
      await store.importBackup(JSON.stringify(backup));

      const exported = JSON.parse(store.exportBackup());

      expect(exported.app).toBe('rutigym');
      expect(exported.days).toEqual(['tue']);
      expect(exported.routines.tue).toEqual([{ exerciseId: 'espalda-dominadas', series: 5 }]);
    });
  });
});
