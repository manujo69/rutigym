import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MemoryRoutineRepository } from '../../../core/data/memory-routine.repository';
import { ROUTINE_REPOSITORY } from '../../../core/data/routine.repository';
import { RoutineStore } from '../../../core/routine-store';
import { ProgressComponent } from './progress.component';

describe('ProgressComponent', () => {
  let fixture: ComponentFixture<ProgressComponent>;
  let store: RoutineStore;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ProgressComponent],
      providers: [
        provideRouter([]),
        { provide: ROUTINE_REPOSITORY, useClass: MemoryRoutineRepository },
      ],
    });

    store = TestBed.inject(RoutineStore);
    await store.init();
    fixture = TestBed.createComponent(ProgressComponent);
    fixture.detectChanges();
  });

  it('renders the seven weekdays with their initials', () => {
    const letters = [...fixture.nativeElement.querySelectorAll('.week__letter')].map(
      (element: HTMLElement) => element.textContent?.trim(),
    );

    expect(letters).toEqual(['L', 'M', 'X', 'J', 'V', 'S', 'D']);
  });

  it('shows the detail of the last finished day under the week strip', () => {
    store.savePlan(['mon']);
    store.addExercise('mon', 'core-plancha', 1);
    store.saveSets('mon', 'core-plancha', [{ reps: 12, kg: 0, done: true }]);
    store.finishDay('mon');
    fixture.detectChanges();

    const exercise = fixture.nativeElement.querySelector('.exercise');

    expect(exercise).not.toBeNull();
    expect(exercise.textContent).toContain('Plancha abdominal');
    expect(exercise.textContent).toContain('12 reps');
  });

  it('changes the detail when another day of the week is selected', () => {
    store.savePlan(['mon', 'wed']);
    store.addExercise('mon', 'core-plancha', 1);
    store.addExercise('wed', 'piernas-prensa', 1);
    store.saveSets('mon', 'core-plancha', [{ reps: 12, kg: 0, done: true }]);
    store.saveSets('wed', 'piernas-prensa', [{ reps: 10, kg: 80, done: true }]);
    store.finishDay('mon', new Date(2026, 10, 16));
    store.finishDay('wed', new Date(2026, 10, 18));
    fixture.detectChanges();

    // Por defecto, el último día con sesión.
    expect(fixture.nativeElement.querySelector('.exercise').textContent).toContain('Prensa de piernas');

    const monday = [...fixture.nativeElement.querySelectorAll('.week__tile')][0] as HTMLButtonElement;
    monday.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.exercise').textContent).toContain('Plancha abdominal');
  });

  it('titles the day with its date, without the routine when they match', () => {
    store.clearDemoSessions();
    store.savePlan(['mon']);
    store.addExercise('mon', 'core-plancha', 1);
    store.saveSets('mon', 'core-plancha', [{ reps: 12, kg: 0, done: true }]);
    store.finishDay('mon', new Date(2026, 10, 16));
    fixture.detectChanges();

    const head = fixture.nativeElement.querySelector('.detail__head').textContent;

    expect(head).toContain('LUNES, 16 NOV');
    expect(head).not.toContain('Rutina del');
  });

  it('notes the routine when the day does not match the date', () => {
    store.clearDemoSessions();
    store.savePlan(['mon']);
    store.addExercise('mon', 'core-plancha', 1);
    store.saveSets('mon', 'core-plancha', [{ reps: 12, kg: 0, done: true }]);
    store.finishDay('mon', new Date(2026, 10, 19));
    fixture.detectChanges();

    const head = fixture.nativeElement.querySelector('.detail__head').textContent;

    expect(head).toContain('JUEVES, 19 NOV');
    expect(head).toContain('(Rutina del Lunes)');
  });

  it('loads the week of the date chosen in the calendar', () => {
    store.clearDemoSessions();
    store.savePlan(['wed']);
    store.addExercise('wed', 'piernas-prensa', 1);
    store.saveSets('wed', 'piernas-prensa', [{ reps: 10, kg: 70, done: true }]);
    store.finishDay('wed', new Date(2026, 10, 11));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Aún no hay sesiones esta semana');

    (fixture.nativeElement.querySelector('.week-picker') as HTMLButtonElement).click();
    fixture.detectChanges();

    const target = [...fixture.nativeElement.querySelectorAll('.day')].find(
      (element: HTMLElement) => element.textContent?.trim() === '11',
    ) as HTMLButtonElement;
    target.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.detail__head').textContent).toContain(
      'MIÉRCOLES, 11 NOV',
    );
    expect(fixture.nativeElement.querySelector('.exercise').textContent).toContain(
      'Prensa de piernas',
    );
  });

  it('seeds the demo history and lets the user remove it', () => {
    expect(fixture.nativeElement.querySelectorAll('.week__tile--done').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelector('.progress__demo')).not.toBeNull();

    fixture.nativeElement.querySelector('.progress__demo .btn--link').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.progress__demo')).toBeNull();
    expect(store.sessions().length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Aún no hay sesiones esta semana');
  });
});
