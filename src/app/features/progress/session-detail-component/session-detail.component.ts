import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import { exerciseById } from '../../../core/exercise-catalog';
import { formatKg } from '../../../core/models';
import {
  hasPreviousSession,
  oneRepMax,
  sessionRecords,
  sessionVolume,
} from '../../../core/session-stats';
import { RoutineStore } from '../../../core/routine-store';
import { ExerciseStatsComponent } from '../exercise-stats-component/exercise-stats.component';

interface DetailSet {
  readonly index: number;
  readonly kg: string;
  readonly reps: number;
  readonly rm: string;
  readonly done: boolean;
  readonly best: boolean;
  readonly bodyweight: boolean;
}

interface DetailExercise {
  readonly id: string;
  readonly name: string;
  readonly group: string;
  readonly comparable: boolean;
  readonly sets: readonly DetailSet[];
}

/** Bloque de detalle de una sesión: métricas, ejercicios y acceso a sus estadísticas. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-session-detail',
  imports: [ExerciseStatsComponent],
  templateUrl: './session-detail.component.html',
  styleUrl: './session-detail.component.scss',
})
export class SessionDetailComponent {
  private readonly store = inject(RoutineStore);

  readonly sessionId = input.required<string>();

  protected readonly session = computed(() =>
    this.store.sessions().find((item) => item.id === this.sessionId()),
  );
  protected readonly volume = computed(() => {
    const session = this.session();
    return session ? sessionVolume(session) : 0;
  });
  protected readonly series = computed(
    () =>
      this.session()?.exercises.reduce(
        (total, exercise) => total + exercise.sets.filter((set) => set.done).length,
        0,
      ) ?? 0,
  );
  private readonly previous = computed(() => {
    const session = this.session();
    return session
      ? this.store.sessions().filter((item) => item.id !== session.id && item.date <= session.date)
      : [];
  });
  private readonly records = computed(() => {
    const session = this.session();
    return session ? sessionRecords(session, this.previous()) : new Map();
  });
  protected readonly recordsCount = computed(() => this.records().size);
  protected readonly exercises = computed<DetailExercise[]>(() => {
    const session = this.session();
    if (!session) {
      return [];
    }
    const records = this.records();
    const others = this.previous();
    return session.exercises.map((exercise) => {
      const catalog = exerciseById(exercise.exerciseId);
      const record = records.get(exercise.exerciseId);
      return {
        id: exercise.exerciseId,
        name: catalog?.name ?? exercise.exerciseId,
        group: catalog?.group ?? '',
        comparable: hasPreviousSession(others, exercise.exerciseId),
        sets: exercise.sets.map((set, position) => ({
          index: position + 1,
          kg: formatKg(set.kg),
          reps: set.reps,
          rm: formatKg(oneRepMax(set.kg, set.reps)),
          done: set.done,
          best: record?.setIndex === position + 1,
          bodyweight: set.kg === 0,
        })),
      };
    });
  });

  protected readonly openExercise = signal<string | null>(null);

  protected openStats(exerciseId: string): void {
    this.openExercise.set(exerciseId);
  }

  protected closeStats(): void {
    this.openExercise.set(null);
  }

  protected readonly format = formatKg;
}
