import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { MemoryRoutineRepository } from '../../../core/data/memory-routine.repository';
import { ROUTINE_REPOSITORY } from '../../../core/data/routine.repository';
import { RoutineStore } from '../../../core/routine-store';
import { TrainDayComponent } from './train-day.component';

describe('TrainDayComponent', () => {
  let fixture: ComponentFixture<TrainDayComponent>;
  let store: RoutineStore;
  let navigate: jasmine.Spy;

  async function setup(day: string): Promise<void> {
    fixture = TestBed.createComponent(TrainDayComponent);
    fixture.componentRef.setInput('day', day);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [TrainDayComponent],
      providers: [
        provideRouter([]),
        { provide: ROUTINE_REPOSITORY, useClass: MemoryRoutineRepository },
      ],
    });

    store = TestBed.inject(RoutineStore);
    await store.init();
    store.savePlan(['mon', 'wed']);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  it('warns when the day has no exercises', async () => {
    await setup('mon');

    expect(fixture.nativeElement.textContent).toContain('Sin ejercicios para este día');
  });

  it('groups the routine and shows the progress of each exercise', async () => {
    store.addExercise('mon', 'core-plancha', 2);
    store.addExercise('mon', 'piernas-prensa', 3);
    store.saveSets('mon', 'core-plancha', [
      { reps: 12, kg: 0, done: true },
      { reps: 12, kg: 0, done: false },
    ]);
    await setup('mon');

    const groups = [...fixture.nativeElement.querySelectorAll('.group-heading')].map(
      (element: HTMLElement) => element.textContent?.trim().split(/\s+/)[0],
    );

    expect(groups).toEqual(['CORE', 'PIERNAS']);
    expect(fixture.nativeElement.textContent).toContain('1/2');
    expect(fixture.nativeElement.querySelector('.day-progress__count').textContent).toContain('1 / 5');
  });

  it('opens the exercise when a row is clicked', async () => {
    store.addExercise('mon', 'core-plancha');
    await setup('mon');

    fixture.nativeElement.querySelector('.list-row').click();

    expect(navigate).toHaveBeenCalledWith(['/entrenar', 'mon', 'core-plancha']);
  });
});
