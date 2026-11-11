import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { exerciseById } from '../../../core/exercise-catalog';
import {
  DAY_LABELS,
  WeekDay,
  WorkoutSession,
  formatKg,
  formatSessionDate,
  parseIsoDate,
  toIsoDate,
} from '../../../core/models';
import { RoutineStore } from '../../../core/routine-store';

interface SessionRow {
  readonly name: string;
  readonly group: string;
  readonly sets: string;
}

interface SessionCard {
  readonly id: string;
  readonly title: string;
  readonly demo: boolean;
  readonly isToday: boolean;
  readonly series: number;
  readonly rows: readonly SessionRow[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-progress',
  imports: [RouterLink],
  templateUrl: './progress.component.html',
  styleUrl: './progress.component.scss',
})
export class ProgressComponent {
  private readonly store = inject(RoutineStore);

  protected readonly labels = DAY_LABELS;
  protected readonly week = computed<WeekDay[]>(() => this.store.weekOverview());
  protected readonly sessions = computed<SessionCard[]>(() =>
    this.store.sessions().map((session) => this.toCard(session)),
  );
  protected readonly hasDemo = computed(() => this.store.sessions().some((session) => session.demo));
  protected readonly weekDone = computed(
    () => this.week().filter((day) => day.state === 'done').length,
  );
  protected readonly weekPlanned = computed(
    () => this.week().filter((day) => day.label !== 'Descanso').length,
  );
  protected readonly weekRange = computed(() => {
    const days = this.week();
    return `${this.shortDate(days[0].date)} – ${this.shortDate(days[days.length - 1].date)}`;
  });

  constructor() {
    this.store.ensureDemoHistory();
  }

  protected clearDemo(): void {
    this.store.clearDemoSessions();
  }

  private toCard(session: WorkoutSession): SessionCard {
    return {
      id: session.id,
      title: `${this.labels[session.day].long} · ${formatSessionDate(session.date)}`,
      demo: !!session.demo,
      isToday: session.date === toIsoDate(new Date()),
      series: session.exercises.reduce(
        (total, exercise) => total + exercise.sets.filter((set) => set.done).length,
        0,
      ),
      rows: session.exercises.map((exercise) => {
        const catalog = exerciseById(exercise.exerciseId);
        return {
          name: catalog?.name ?? exercise.exerciseId,
          group: catalog?.group ?? '',
          sets: exercise.sets
            .filter((set) => set.done)
            .map((set) => (set.kg === 0 ? `${set.reps} reps` : `${formatKg(set.kg)} kg × ${set.reps}`))
            .join(' · '),
        };
      }),
    };
  }

  private shortDate(iso: string): string {
    const formatted = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(
      parseIsoDate(iso),
    );
    return formatted.replace('.', '').toUpperCase();
  }
}
