import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MemoryRoutineRepository } from '../../../core/data/memory-routine.repository';
import { ROUTINE_REPOSITORY } from '../../../core/data/routine.repository';
import { RoutineStore } from '../../../core/routine-store';
import { ConfigDayComponent } from './config-day.component';

describe('ConfigDayComponent', () => {
  let fixture: ComponentFixture<ConfigDayComponent>;
  let store: RoutineStore;

  async function setup(day: string): Promise<void> {
    fixture = TestBed.createComponent(ConfigDayComponent);
    fixture.componentRef.setInput('day', day);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ConfigDayComponent],
      providers: [
        provideRouter([]),
        { provide: ROUTINE_REPOSITORY, useClass: MemoryRoutineRepository },
      ],
    });

    store = TestBed.inject(RoutineStore);
    await store.init();
    store.savePlan(['mon', 'wed']);
  });

  it('shows the empty state when the day has no exercises', async () => {
    await setup('mon');

    expect(fixture.nativeElement.querySelector('.empty-state')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Esta rutina está vacía');
  });

  it('renders the routine and increases the series of an exercise', async () => {
    store.addExercise('mon', 'core-plancha', 3);
    await setup('mon');

    const row = fixture.nativeElement.querySelector('.exercise');
    const plus = row.querySelectorAll('.stepper__btn')[1];

    expect(row.textContent).toContain('Plancha abdominal');
    expect(row.querySelector('.stepper__count').textContent.trim()).toBe('3');

    plus.click();
    fixture.detectChanges();

    expect(store.seriesFor('mon', 'core-plancha')).toBe(4);
  });

  it('removes an exercise from the routine', async () => {
    store.addExercise('mon', 'core-plancha');
    await setup('mon');

    fixture.nativeElement.querySelector('.exercise__remove').click();
    fixture.detectChanges();

    expect(store.isPlanned('mon', 'core-plancha')).toBeFalse();
    expect(fixture.nativeElement.querySelector('.empty-state')).not.toBeNull();
  });

  it('rejects a day that is not part of the plan', async () => {
    await setup('fri');

    expect(fixture.nativeElement.textContent).toContain('Día no configurado');
  });
});
