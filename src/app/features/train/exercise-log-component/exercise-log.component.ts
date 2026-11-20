import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { exerciseById } from '../../../core/exercise-catalog';
import { muscleName } from '../../../core/muscle-names';
import {
  DAY_ORDER,
  DayKey,
  ExerciseValues,
  KG_STEP,
  REPS_STEP,
  SetEntry,
  clampKg,
  clampReps,
} from '../../../core/models';
import { RoutineStore } from '../../../core/routine-store';
import { hasPreviousSession } from '../../../core/session-stats';
import { ExerciseStatsComponent } from '../../progress/exercise-stats-component/exercise-stats.component';
import { MuscleMapComponent } from '../muscle-map-component/muscle-map.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exercise-log',
  imports: [RouterLink, MuscleMapComponent, ExerciseStatsComponent],
  templateUrl: './exercise-log.component.html',
  styleUrl: './exercise-log.component.scss',
})
export class ExerciseLogComponent {
  private readonly store = inject(RoutineStore);
  private readonly router = inject(Router);

  readonly day = input.required<string>();
  readonly exerciseId = input.required<string>();

  protected readonly dayKey = computed<DayKey | null>(() => {
    const value = this.day() as DayKey;
    return DAY_ORDER.includes(value) ? value : null;
  });
  protected readonly exercise = computed(() => exerciseById(this.exerciseId()));
  protected readonly heroImage = computed(() => this.exercise()?.image ?? null);
  protected readonly muscles = computed(() => this.exercise()?.muscles ?? []);
  /** Solo hay comparación posible si el ejercicio ya se registró otro día. */
  protected readonly canCompare = computed(() =>
    hasPreviousSession(this.store.sessions(), this.exerciseId()),
  );
  protected readonly statsOpen = signal(false);
  /** One label per worked muscle: the exercise can override them for precision. */
  protected readonly labels = computed(() => {
    const names = this.exercise()?.names;
    return names && names.length > 0 ? names : this.muscles().map(muscleName);
  });
  protected readonly planned = computed(() => {
    const day = this.dayKey();
    return !!day && this.store.isPlanned(day, this.exerciseId());
  });
  protected readonly entries = computed<readonly SetEntry[]>(() => {
    const day = this.dayKey();
    return day ? this.store.setsFor(day, this.exerciseId()) : [];
  });
  protected readonly doneCount = computed(
    () => this.entries().filter((entry) => entry.done).length,
  );
  protected readonly percent = computed(() => {
    const total = this.entries().length;
    return total === 0 ? 0 : Math.round((this.doneCount() / total) * 100);
  });

  protected formatKg(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
  }

  protected toggleDone(index: number): void {
    const entry = this.entries()[index];
    this.patch(index, { done: !entry.done });
  }

  protected adjustReps(index: number, direction: -1 | 1): void {
    this.update(index, { reps: clampReps(this.entries()[index].reps + direction * REPS_STEP) });
  }

  protected adjustKg(index: number, direction: -1 | 1): void {
    this.update(index, { kg: clampKg(this.entries()[index].kg + direction * KG_STEP) });
  }

  protected addSeries(): void {
    const day = this.dayKey();
    if (day) {
      this.store.addSeries(day, this.exerciseId());
    }
  }

  /** Saves nothing extra (every tap is persisted) and moves to the next exercise of the day. */
  protected next(): void {
    const day = this.dayKey();
    if (!day) {
      return;
    }
    const routine = this.store.routinesFor(day).map((item) => item.exerciseId);
    const index = routine.indexOf(this.exerciseId());
    const nextId = index >= 0 ? routine[index + 1] : undefined;
    void this.router.navigate(nextId ? ['/entrenar', day, nextId] : ['/entrenar', day]);
  }

  private update(index: number, changes: Partial<ExerciseValues>): void {
    const day = this.dayKey();
    if (day) {
      this.store.updateSet(day, this.exerciseId(), index, changes);
    }
  }

  private patch(index: number, changes: Partial<SetEntry>): void {
    const day = this.dayKey();
    if (!day) {
      return;
    }
    const entries = this.entries().map((entry, position) =>
      position === index ? { ...entry, ...changes } : entry,
    );
    this.store.saveSets(day, this.exerciseId(), entries);
  }
}
