import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  DAY_LABELS,
  WeekDay,
  WorkoutSession,
  dayKeyFromJsDay,
  parseIsoDate,
  startOfWeek,
  toIsoDate,
} from '../../../core/models';
import { RoutineStore } from '../../../core/routine-store';
import { SessionDetailComponent } from '../session-detail-component/session-detail.component';
import { WeekCalendarComponent } from '../week-calendar-component/week-calendar.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-progress',
  imports: [RouterLink, SessionDetailComponent, WeekCalendarComponent],
  templateUrl: './progress.component.html',
  styleUrl: './progress.component.scss',
})
export class ProgressComponent {
  private readonly store = inject(RoutineStore);

  protected readonly labels = DAY_LABELS;
  /** Semana mostrada; cambia con el calendario. */
  private readonly reference = signal(new Date());
  protected readonly week = computed<WeekDay[]>(() => this.store.weekOverview(this.reference()));
  protected readonly hasDemo = computed(() => this.store.sessions().some((session) => session.demo));
  protected readonly weekRange = computed(() => {
    const days = this.week();
    return `${this.shortDate(days[0].date)} – ${this.shortDate(days[days.length - 1].date)}`;
  });

  /** Sesiones guardadas dentro de la semana que muestra la tira. */
  private readonly weekSessions = computed<WorkoutSession[]>(() => {
    const dates = new Set(this.week().map((day) => day.date));
    return this.store
      .sessions()
      .filter((session) => dates.has(session.date))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  });

  /** Día elegido en la tira; sin elección, el último con sesión. */
  private readonly selectedDate = signal<string | null>(null);
  protected readonly detail = computed<WorkoutSession | null>(() => {
    const sessions = this.weekSessions();
    if (sessions.length === 0) {
      return null;
    }
    const chosen = this.selectedDate();
    return sessions.find((session) => session.date === chosen) ?? sessions[0];
  });
  /** Título con el día de la fecha en que se registró: "JUEVES, 19 NOV". */
  protected readonly detailTitle = computed(() => {
    const session = this.detail();
    return session ? this.dateTitle(session.date) : '';
  });
  /** Solo cuando la rutina no corresponde al día de la fecha. */
  protected readonly detailRoutine = computed(() => {
    const session = this.detail();
    if (!session) {
      return '';
    }
    const weekday = dayKeyFromJsDay(parseIsoDate(session.date).getDay());
    if (weekday === session.day) {
      return '';
    }
    const label = this.labels[session.day].long;
    return `(Rutina del ${label.charAt(0) + label.slice(1).toLowerCase()})`;
  });

  protected readonly calendarOpen = signal(false);
  /** Primer día con entrenamiento: todo lo anterior queda deshabilitado en el calendario. */
  protected readonly firstLogged = computed(() => {
    const dates = this.store.sessions().map((session) => session.date).sort();
    return dates[0] ?? null;
  });
  protected readonly loggedDates = computed(() =>
    this.store.sessions().map((session) => session.date),
  );
  protected readonly isCurrentWeek = computed(
    () =>
      toIsoDate(startOfWeek(this.reference())) === toIsoDate(startOfWeek(new Date())),
  );
  protected readonly selectedIso = computed(() => this.detail()?.date ?? toIsoDate(this.reference()));

  constructor() {
    this.store.ensureDemoHistory();
  }

  protected pickWeek(iso: string): void {
    this.reference.set(parseIsoDate(iso));
    const hasSession = this.store.sessions().some((session) => session.date === iso);
    this.selectedDate.set(hasSession ? iso : null);
    this.calendarOpen.set(false);
  }

  protected goToday(): void {
    this.reference.set(new Date());
    this.selectedDate.set(null);
  }

  protected isSelected(day: WeekDay): boolean {
    return this.detail()?.date === day.date;
  }

  protected select(day: WeekDay): void {
    if (day.state === 'done') {
      this.selectedDate.set(day.date);
    }
  }

  protected clearDemo(): void {
    this.store.clearDemoSessions();
    this.selectedDate.set(null);
  }

  private dateTitle(iso: string): string {
    const date = parseIsoDate(iso);
    const weekday = new Intl.DateTimeFormat('es-ES', { weekday: 'long' })
      .format(date)
      .toUpperCase();
    const month = new Intl.DateTimeFormat('es-ES', { month: 'short' })
      .format(date)
      .replace('.', '')
      .toUpperCase();
    return `${weekday}, ${date.getDate()} ${month}`;
  }

  private shortDate(iso: string): string {
    const formatted = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(
      parseIsoDate(iso),
    );
    return formatted.replace('.', '').toUpperCase();
  }

}
