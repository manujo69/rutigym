import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { MemoryRoutineRepository } from '../../../core/data/memory-routine.repository';
import { ROUTINE_REPOSITORY } from '../../../core/data/routine.repository';
import { RoutineStore } from '../../../core/routine-store';
import { TrainComponent } from './train.component';

describe('TrainComponent', () => {
  let fixture: ComponentFixture<TrainComponent>;
  let store: RoutineStore;
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [TrainComponent],
      providers: [
        provideRouter([]),
        { provide: ROUTINE_REPOSITORY, useClass: MemoryRoutineRepository },
      ],
    });

    store = TestBed.inject(RoutineStore);
    await store.init();
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  it('asks for a plan when there is none', () => {
    fixture = TestBed.createComponent(TrainComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Todavía no hay rutina');
  });

  it('preselects a configured day and starts it', async () => {
    store.savePlan(['mon', 'wed']);
    store.addExercise('mon', 'core-plancha');
    fixture = TestBed.createComponent(TrainComponent);
    fixture.detectChanges();

    const selected = fixture.nativeElement.querySelector('.day-row--on');
    expect(selected).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.day-row').length).toBe(2);
    expect(selected.textContent).toContain(store.defaultDay() === 'mon' ? 'LUNES' : 'MIÉRCOLES');

    const monday = [...fixture.nativeElement.querySelectorAll('.day-row')].find(
      (element: HTMLElement) => element.textContent?.includes('LUNES'),
    ) as HTMLButtonElement;
    monday.click();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.sticky-actions button').click();

    expect(navigate).toHaveBeenCalledWith(['/entrenar', 'mon']);
  });
});
