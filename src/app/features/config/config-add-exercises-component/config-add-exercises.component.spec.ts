import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { MemoryRoutineRepository } from '../../../core/data/memory-routine.repository';
import { ROUTINE_REPOSITORY } from '../../../core/data/routine.repository';
import { RoutineStore } from '../../../core/routine-store';
import { ConfigAddExercisesComponent } from './config-add-exercises.component';

describe('ConfigAddExercisesComponent', () => {
  let fixture: ComponentFixture<ConfigAddExercisesComponent>;
  let store: RoutineStore;
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ConfigAddExercisesComponent],
      providers: [
        provideRouter([]),
        { provide: ROUTINE_REPOSITORY, useClass: MemoryRoutineRepository },
      ],
    });

    store = TestBed.inject(RoutineStore);
    await store.init();
    store.savePlan(['mon']);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(ConfigAddExercisesComponent);
    fixture.componentRef.setInput('day', 'mon');
    fixture.detectChanges();
  });

  function row(name: string): HTMLButtonElement {
    return [...fixture.nativeElement.querySelectorAll('.pick-row')].find((element: HTMLElement) =>
      element.textContent?.includes(name),
    ) as HTMLButtonElement;
  }

  it('disables the exercises already in the routine', () => {
    store.addExercise('mon', 'core-plancha');
    fixture.detectChanges();

    expect(row('Plancha abdominal').disabled).toBeTrue();
    expect(row('Elevación de piernas').disabled).toBeFalse();
  });

  it('adds the selected exercises and returns to the day editor', () => {
    row('Elevación de piernas').click();
    row('Hollow hold').click();
    fixture.detectChanges();

    const addButton = fixture.nativeElement.querySelector('.sticky-actions button');
    expect(addButton.textContent).toContain('Añadir 2');

    addButton.click();

    expect(store.isPlanned('mon', 'core-elevacion-piernas')).toBeTrue();
    expect(store.isPlanned('mon', 'core-hollow')).toBeTrue();
    expect(navigate).toHaveBeenCalledWith(['/configurar/rutinas', 'mon']);
  });

  it('shows the machine thumbnail between the check and the name', () => {
    const plancha = row('Plancha abdominal');
    const image = plancha.querySelector('.pick-row__thumb img') as HTMLImageElement;

    expect(image).toBeTruthy();
    expect(image.getAttribute('src')).toBe('/exercises/floor-mat.webp');
    expect(image.getAttribute('loading')).toBe('lazy');
    expect(image.getAttribute('alt')).toBe('');

    expect([...plancha.children].map((child) => child.className)).toEqual([
      'pick-row__box',
      'pick-row__thumb',
      'pick-row__name',
    ]);
  });

  it('fits every row in a narrow viewport without horizontal overflow', () => {
    const host = fixture.nativeElement as HTMLElement;
    host.style.display = 'block';

    for (const width of ['360px', '412px']) {
      host.style.width = width;
      fixture.detectChanges();

      const rows = [...host.querySelectorAll('.pick-row')] as HTMLElement[];

      expect(rows.length).toBeGreaterThan(0);
      for (const element of rows) {
        expect(element.scrollWidth)
          .withContext(`${width}: la fila no entra en la pantalla`)
          .toBeLessThanOrEqual(element.clientWidth + 1);
      }
      expect(host.scrollWidth)
        .withContext(`${width}: la página desborda a lo ancho`)
        .toBeLessThanOrEqual(host.clientWidth + 1);
    }
  });
});
