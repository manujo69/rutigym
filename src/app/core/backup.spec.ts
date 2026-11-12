import { parseBackup, serializeBackup } from './backup';

function validBackup() {
  return {
    days: ['mon', 'wed'] as const,
    routines: {
      mon: [{ exerciseId: 'core-plancha', series: 3 }],
      wed: [{ exerciseId: 'piernas-prensa', series: 4 }],
    },
    logs: { mon: { 'core-plancha': [{ reps: 10, kg: 20, done: true }] } },
    lastValues: { 'core-plancha': { reps: 10, kg: 20 } },
    sessions: [
      {
        id: 's1',
        date: '2026-11-10',
        day: 'mon' as const,
        exercises: [{ exerciseId: 'core-plancha', sets: [{ reps: 10, kg: 20, done: true }] }],
        demo: true,
      },
    ],
  };
}

describe('backup', () => {
  it('round-trips what the app exports', () => {
    const parsed = parseBackup(serializeBackup(validBackup()));

    expect(parsed.ok).toBeTrue();
    if (!parsed.ok) {
      return;
    }
    expect(parsed.backup.days).toEqual(['mon', 'wed']);
    expect(parsed.backup.routines['mon']).toEqual([{ exerciseId: 'core-plancha', series: 3 }]);
    expect(parsed.backup.logs['mon']?.['core-plancha']).toEqual([
      { reps: 10, kg: 20, done: true },
    ]);
    expect(parsed.backup.sessions.length).toBe(1);
  });

  it('rejects text that is not JSON', () => {
    const parsed = parseBackup('esto no es json');

    expect(parsed.ok).toBeFalse();
    expect(parsed.ok ? '' : parsed.error).toContain('JSON');
  });

  it('rejects a copy from another app', () => {
    const parsed = parseBackup(JSON.stringify({ app: 'otra', version: 1 }));

    expect(parsed.ok).toBeFalse();
  });

  it('rejects an unsupported version', () => {
    const parsed = parseBackup(JSON.stringify({ app: 'rutigym', version: 99 }));

    expect(parsed.ok).toBeFalse();
    expect(parsed.ok ? '' : parsed.error).toContain('99');
  });

  it('drops exercises that are no longer in the catalog', () => {
    const payload = {
      app: 'rutigym',
      version: 1,
      days: ['mon'],
      routines: {
        mon: [
          { exerciseId: 'core-plancha', series: 3 },
          { exerciseId: 'ejercicio-que-no-existe', series: 2 },
        ],
      },
      logs: { mon: { 'ejercicio-que-no-existe': [{ reps: 10, kg: 20, done: false }] } },
      lastValues: {},
      sessions: [],
    };

    const parsed = parseBackup(JSON.stringify(payload));

    expect(parsed.ok).toBeTrue();
    if (!parsed.ok) {
      return;
    }
    expect(parsed.backup.routines['mon']).toEqual([{ exerciseId: 'core-plancha', series: 3 }]);
    expect(parsed.backup.logs['mon']?.['ejercicio-que-no-existe']).toBeUndefined();
  });

  it('rejects unknown day keys', () => {
    const payload = {
      app: 'rutigym',
      version: 1,
      days: ['lunes'],
      routines: {},
      logs: {},
      lastValues: {},
      sessions: [],
    };

    expect(parseBackup(JSON.stringify(payload)).ok).toBeFalse();
  });
});
