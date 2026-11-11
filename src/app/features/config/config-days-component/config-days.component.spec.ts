import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { MemoryRoutineRepository } from '../../../core/data/memory-routine.repository';
import { ROUTINE_REPOSITORY } from '../../../core/data/routine.repository';
import { RoutineStore } from '../../../core/routine-store';
import { ConfigDaysComponent } from './config-days.component';

describe('ConfigDaysComponent', () => {
  let fixture: ComponentFixture<ConfigDaysComponent>;
  let store: RoutineStore;
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ConfigDaysComponent],
      providers: [
        provideRouter([]),
        { provide: ROUTINE_REPOSITORY, useClass: MemoryRoutineRepository },
      ],
    });

    store = TestBed.inject(RoutineStore);
    await store.init();
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(ConfigDaysComponent);
    fixture.detectChanges();
  });

  function pick(label: string): void {
    const chip = fixture.nativeElement.querySelector(`.day-grid__item[aria-label="${label}"]`);
    chip.click();
    fixture.detectChanges();
  }

  function continueButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.sticky-actions button');
  }

  it('keeps CONTINUAR disabled until the chosen number of days is picked', () => {
    expect(continueButton().disabled).toBeTrue();

    pick('LUNES');
    pick('MIÉRCOLES');
    expect(continueButton().disabled).toBeTrue();

    pick('VIERNES');
    expect(continueButton().disabled).toBeFalse();
  });

  it('saves the plan and opens the first configured day', () => {
    pick('LUNES');
    pick('MIÉRCOLES');
    pick('VIERNES');

    continueButton().click();

    expect(store.days()).toEqual(['mon', 'wed', 'fri']);
    expect(navigate).toHaveBeenCalledWith(['/configurar/rutinas', 'mon']);
  });
});
