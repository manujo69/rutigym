import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MemoryRoutineRepository } from '../../../core/data/memory-routine.repository';
import { ROUTINE_REPOSITORY } from '../../../core/data/routine.repository';
import { RoutineStore } from '../../../core/routine-store';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let store: RoutineStore;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        { provide: ROUTINE_REPOSITORY, useClass: MemoryRoutineRepository },
      ],
    });

    store = TestBed.inject(RoutineStore);
    await store.init();
    fixture = TestBed.createComponent(HomeComponent);
  });

  it('shows the empty plan state and the three actions', () => {
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Todavía sin configurar');
    expect(fixture.nativeElement.querySelectorAll('.home__actions a').length).toBe(3);
  });

  it('shows the configured days when a plan exists', async () => {
    store.savePlan(['mon', 'wed', 'fri']);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.home__plan-days').textContent).toContain(
      'LUNES, MIÉRCOLES y VIERNES',
    );
  });
});
