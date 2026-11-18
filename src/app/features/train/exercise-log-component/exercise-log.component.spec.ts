import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { MemoryRoutineRepository } from '../../../core/data/memory-routine.repository';
import { ROUTINE_REPOSITORY } from '../../../core/data/routine.repository';
import { RoutineStore } from '../../../core/routine-store';
import { ExerciseLogComponent } from './exercise-log.component';

describe('ExerciseLogComponent', () => {
  let fixture: ComponentFixture<ExerciseLogComponent>;
  let store: RoutineStore;
  let navigate: jasmine.Spy;

  function build(): void {
    fixture = TestBed.createComponent(ExerciseLogComponent);
    fixture.componentRef.setInput('day', 'mon');
    fixture.componentRef.setInput('exerciseId', 'core-plancha');
    fixture.detectChanges();
  }

  beforeEach(async () => {
    spyOn(window, 'fetch').and.resolveTo(new Response('<svg viewBox="0 0 10 10"></svg>'));

    TestBed.configureTestingModule({
      imports: [ExerciseLogComponent],
      providers: [
        provideRouter([]),
        { provide: ROUTINE_REPOSITORY, useClass: MemoryRoutineRepository },
      ],
    });

    store = TestBed.inject(RoutineStore);
    await store.init();
    store.savePlan(['mon']);
    store.addExercise('mon', 'core-plancha', 3);
    store.addExercise('mon', 'brazos-curl-barra', 2);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  it('seeds every series with 10 reps and 20 kg', () => {
    build();

    const rows = fixture.nativeElement.querySelectorAll('.set');
    const values = [...rows[0].querySelectorAll('.set__value')].map((element: HTMLElement) =>
      element.textContent?.trim(),
    );

    expect(rows.length).toBe(3);
    expect(values).toEqual(['20', '10']);
  });

  it('marks a series as done in the store', () => {
    build();

    fixture.nativeElement.querySelector('.set__check').click();
    fixture.detectChanges();

    expect(store.progressFor('mon', 'core-plancha')).toEqual({ done: 1, total: 3 });
    expect(fixture.nativeElement.querySelector('.log__count').textContent).toContain('1/3');
  });

  it('lists the worked muscles of the exercise', () => {
    build();

    const items = [...fixture.nativeElement.querySelectorAll('.exercise-hero__tag li')].map(
      (item: HTMLElement) => item.textContent?.trim(),
    );

    expect(items).toEqual(['Abdominales', 'Oblicuos']);
  });

  it('shows the precise muscle names when the diagram lacks that muscle', () => {
    store.addExercise('mon', 'piernas-abduccion', 3);
    build();
    fixture.componentRef.setInput('exerciseId', 'piernas-abduccion');
    fixture.detectChanges();

    const items = [...fixture.nativeElement.querySelectorAll('.exercise-hero__tag li')].map(
      (item: HTMLElement) => item.textContent?.trim(),
    );

    expect(items).toEqual(['Glúteo medio', 'Tensor de la fascia lata']);
  });

  it('changes the kg of a series with the arrows', () => {
    build();

    const arrows = fixture.nativeElement.querySelectorAll('.set .set__arrow');
    arrows[1].click();
    fixture.detectChanges();

    expect(store.setsFor('mon', 'core-plancha')[0].kg).toBe(22.5);
  });

  it('copies a weight change to the following series', () => {
    build();

    const arrows = fixture.nativeElement.querySelectorAll('.set .set__arrow');
    arrows[1].click();
    fixture.detectChanges();

    expect(store.setsFor('mon', 'core-plancha').map((entry) => entry.kg)).toEqual([
      22.5, 22.5, 22.5,
    ]);
  });

  it('shows the series of the last session when the exercise is opened again', () => {
    store.saveSets('mon', 'core-plancha', [
      { reps: 20, kg: 0, done: true },
      { reps: 18, kg: 0, done: true },
      { reps: 16, kg: 0, done: true },
    ]);
    store.finishDay('mon');

    build();

    const rows = [...fixture.nativeElement.querySelectorAll('.set')] as HTMLElement[];
    const values = rows.map((row) =>
      [...row.querySelectorAll('.set__value')].map((element) => element.textContent?.trim()),
    );

    expect(values).toEqual([
      ['0', '20'],
      ['0', '18'],
      ['0', '16'],
    ]);
  });

  it('adds an extra series beyond the configured ones', () => {
    build();

    fixture.nativeElement.querySelector('.add-set').click();
    fixture.detectChanges();

    expect(store.setsFor('mon', 'core-plancha').length).toBe(4);
    expect(fixture.nativeElement.querySelectorAll('.set').length).toBe(4);
  });

  it('moves to the next exercise of the day', () => {
    build();

    fixture.nativeElement.querySelector('.sticky-actions button').click();

    expect(navigate).toHaveBeenCalledWith(['/entrenar', 'mon', 'brazos-curl-barra']);
  });

  it('fits every series row in a narrow viewport without horizontal overflow', () => {
    build();

    const host = fixture.nativeElement as HTMLElement;
    host.style.display = 'block';

    // La serie activa (hecha) sobresale del padding: también tiene que entrar en la pantalla.
    (host.querySelector('.set__check') as HTMLButtonElement).click();
    fixture.detectChanges();

    for (const width of ['360px', '412px']) {
      host.style.width = width;
      fixture.detectChanges();

      const rows = [...host.querySelectorAll('.set')] as HTMLElement[];

      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.scrollWidth)
          .withContext(`${width}: la fila de series desborda`)
          .toBeLessThanOrEqual(row.clientWidth + 1);
      }
      expect(host.scrollWidth)
        .withContext(`${width}: la página desborda a lo ancho`)
        .toBeLessThanOrEqual(host.clientWidth + 1);
    }
  });
});
