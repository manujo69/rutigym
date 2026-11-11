import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MemoryRoutineRepository } from '../../../core/data/memory-routine.repository';
import { ROUTINE_REPOSITORY } from '../../../core/data/routine.repository';
import { RoutineStore } from '../../../core/routine-store';
import { ConfigComponent } from './config.component';

describe('ConfigComponent', () => {
  let fixture: ComponentFixture<ConfigComponent>;
  let store: RoutineStore;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ConfigComponent],
      providers: [
        provideRouter([]),
        { provide: ROUTINE_REPOSITORY, useClass: MemoryRoutineRepository },
      ],
    });

    store = TestBed.inject(RoutineStore);
    await store.init();
    fixture = TestBed.createComponent(ConfigComponent);
  });

  it('offers EMPEZAR when there is no plan', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sin configurar');
    expect(fixture.nativeElement.querySelector('.btn--primary').textContent).toContain('Empezar');
  });

  it('asks for confirmation before clearing the plan', async () => {
    store.savePlan(['mon', 'wed']);
    fixture.detectChanges();

    const danger = fixture.nativeElement.querySelector('.btn--danger');
    danger.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.config__confirm')).not.toBeNull();

    fixture.nativeElement.querySelector('.config__confirm-actions .btn--danger').click();
    fixture.detectChanges();

    expect(store.hasPlan()).toBeFalse();
  });

  it('cancels the confirmation without touching the plan', async () => {
    store.savePlan(['mon']);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.btn--danger').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.config__confirm-actions .btn--ghost').click();
    fixture.detectChanges();

    expect(store.hasPlan()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.config__confirm')).toBeNull();
  });
});
