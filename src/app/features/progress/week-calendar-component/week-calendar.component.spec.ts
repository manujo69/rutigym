import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeekCalendarComponent } from './week-calendar.component';

describe('WeekCalendarComponent', () => {
  let fixture: ComponentFixture<WeekCalendarComponent>;

  function build(selected: string, firstLogged: string | null): void {
    TestBed.configureTestingModule({ imports: [WeekCalendarComponent] });
    fixture = TestBed.createComponent(WeekCalendarComponent);
    fixture.componentRef.setInput('selected', selected);
    fixture.componentRef.setInput('firstLogged', firstLogged);
    fixture.detectChanges();
  }

  function day(label: string): HTMLButtonElement {
    return [...fixture.nativeElement.querySelectorAll('.day')].find(
      (element: HTMLElement) => element.textContent?.trim() === label,
    ) as HTMLButtonElement;
  }

  it('draws six weeks and marks the selected day', () => {
    build('2026-11-19', '2026-11-11');

    const days = fixture.nativeElement.querySelectorAll('.day');
    expect(days.length).toBe(42);
    expect(day('19').classList).toContain('day--selected');
  });

  it('disables every day before the first workout', () => {
    build('2026-11-19', '2026-11-11');

    expect(day('10').disabled).toBeTrue();
    expect(day('11').disabled).toBeFalse();
    expect(day('19').disabled).toBeFalse();
  });

  it('emits the picked date', () => {
    build('2026-11-19', '2026-11-11');
    const picked: string[] = [];
    fixture.componentInstance.picked.subscribe((iso) => picked.push(iso));

    day('12').click();

    expect(picked).toEqual(['2026-11-12']);
  });

  it('navigates to another month and picks a date from it', () => {
    build('2026-11-19', '2026-11-11');
    const picked: string[] = [];
    fixture.componentInstance.picked.subscribe((iso) => picked.push(iso));

    const forward = fixture.nativeElement.querySelectorAll('.month__nav')[1] as HTMLButtonElement;
    forward.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.month__title').textContent).toContain(
      'diciembre 2026',
    );

    day('1').click();

    expect(picked).toEqual(['2026-12-01']);
  });

  it('also picks a day of the next month shown in the current grid', () => {
    build('2026-11-19', '2026-11-11');
    const picked: string[] = [];
    fixture.componentInstance.picked.subscribe((iso) => picked.push(iso));

    // El 6 de diciembre cae en la última fila de la rejilla de noviembre.
    const outside = [...fixture.nativeElement.querySelectorAll('.day--outside')].find(
      (element: HTMLElement) => element.textContent?.trim() === '6',
    ) as HTMLButtonElement;
    outside.click();

    expect(picked).toEqual(['2026-12-06']);
  });

  it('only allows going back to the month of the first workout', () => {
    build('2026-11-19', '2026-11-11');
    const back = fixture.nativeElement.querySelectorAll('.month__nav')[0] as HTMLButtonElement;

    expect(back.disabled).toBeTrue();
  });
});
