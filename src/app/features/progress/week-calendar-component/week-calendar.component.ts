import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { addDays, parseIsoDate, toIsoDate } from '../../../core/models';

interface CalendarDay {
  readonly iso: string;
  readonly day: number;
  readonly outside: boolean;
  readonly disabled: boolean;
  readonly today: boolean;
  readonly selected: boolean;
  readonly logged: boolean;
}

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Calendario propio en modal: elige una fecha y deshabilita lo anterior al primer registro. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-week-calendar',
  templateUrl: './week-calendar.component.html',
  styleUrl: './week-calendar.component.scss',
})
export class WeekCalendarComponent {
  /** Fecha mostrada, en ISO. */
  readonly selected = input.required<string>();
  /** Primer día con entrenamiento; todo lo anterior queda deshabilitado. */
  readonly firstLogged = input<string | null>(null);
  /** Días con sesión, para marcarlos con un punto. */
  readonly logged = input<readonly string[]>([]);

  readonly picked = output<string>();
  readonly closed = output<void>();

  protected readonly weekdays = WEEKDAYS;
  protected readonly todayIso = toIsoDate(new Date());
  /** Mes en pantalla; null hasta que el usuario navega (el inicial sale de la fecha elegida). */
  private readonly cursor = signal<{ year: number; month: number } | null>(null);
  private readonly view = computed(() => this.cursor() ?? this.monthOf(this.selected()));

  protected readonly title = computed(() => {
    const { year, month } = this.view();
    return `${MONTHS[month]} ${year}`;
  });

  protected readonly canGoBack = computed(() => {
    const first = this.firstLogged();
    if (!first) {
      return false;
    }
    const firstMonth = this.monthOf(first);
    const { year, month } = this.view();
    return year > firstMonth.year || (year === firstMonth.year && month > firstMonth.month);
  });

  protected readonly days = computed<CalendarDay[]>(() => {
    const { year, month } = this.view();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const start = addDays(first, -offset);
    const minimum = this.firstLogged();
    const selected = this.selected();
    const logged = new Set(this.logged());

    return Array.from({ length: 42 }, (_, index) => {
      const date = addDays(start, index);
      const iso = toIsoDate(date);
      return {
        iso,
        day: date.getDate(),
        outside: date.getMonth() !== month,
        disabled: minimum !== null && iso < minimum,
        today: iso === this.todayIso,
        selected: iso === selected,
        logged: logged.has(iso),
      };
    });
  });

  protected pick(day: CalendarDay): void {
    if (day.disabled) {
      return;
    }
    this.picked.emit(day.iso);
  }

  protected back(): void {
    if (!this.canGoBack()) {
      return;
    }
    const { year, month } = this.view();
    this.cursor.set(month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  }

  protected forward(): void {
    const { year, month } = this.view();
    this.cursor.set(month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });
  }

  protected close(): void {
    this.closed.emit();
  }

  private monthOf(iso: string): { year: number; month: number } {
    const date = parseIsoDate(iso);
    return { year: date.getFullYear(), month: date.getMonth() };
  }
}
