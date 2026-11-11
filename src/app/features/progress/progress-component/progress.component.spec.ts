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

  it('shows one card per finished session, with the weights and reps', () => {
    store.savePlan(['mon']);
    store.addExercise('mon', 'core-plancha', 1);
    store.saveSets('mon', 'core-plancha', [{ reps: 12, kg: 0, done: true }]);
    store.finishDay('mon');
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.session');

    expect(card).not.toBeNull();
    expect(card.textContent).toContain('Plancha abdominal');
    expect(card.textContent).toContain('12 reps');
  });

  it('seeds the demo history and lets the user remove it', () => {
    expect(fixture.nativeElement.querySelectorAll('.session').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelector('.progress__demo')).not.toBeNull();

    fixture.nativeElement.querySelector('.progress__demo .btn--link').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.progress__demo')).toBeNull();
    expect(store.sessions().length).toBe(0);
  });
});
