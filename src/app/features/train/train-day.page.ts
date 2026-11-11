import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { exerciseById } from '../../core/exercise-catalog';
import { DAY_LABELS, DAY_ORDER, DayKey } from '../../core/models';
import { RoutineStore } from '../../core/routine-store';

interface ExerciseRow {
  readonly id: string;
  readonly name: string;
  readonly total: number;
  readonly done: number;
}

interface ExerciseSection {
  readonly group: string;
  readonly exercises: readonly ExerciseRow[];
}

@Component({
  selector: 'app-train-day-page',
  imports: [RouterLink],
  templateUrl: './train-day.page.html',
  styleUrl: './train-day.page.scss',
})
export class TrainDayPage {
  protected readonly store = inject(RoutineStore);
  private readonly router = inject(Router);

  readonly day = input.required<string>();

  protected readonly dayKey = computed<DayKey | null>(() => {
    const value = this.day() as DayKey;
    return DAY_ORDER.includes(value) ? value : null;
  });
  protected readonly dayLabel = computed(() => {
    const key = this.dayKey();
    return key ? DAY_LABELS[key].long : '';
  });
  protected readonly progress = computed(() => {
    const key = this.dayKey();
    return key ? this.store.dayProgressFor(key) : { done: 0, total: 0 };
  });
  protected readonly percent = computed(() => {
    const { done, total } = this.progress();
    return total === 0 ? 0 : Math.round((done / total) * 100);
  });
  protected readonly sections = computed<ExerciseSection[]>(() => {
    const key = this.dayKey();
    return this.store.groupedExercises().map((section) => ({
      group: section.group,
      exercises: section.exercises.map((planned) => {
        const exercise = exerciseById(planned.exerciseId);
        const progress = key
          ? this.store.progressFor(key, planned.exerciseId)
          : { done: 0, total: planned.series };
        return {
          id: planned.exerciseId,
          name: exercise?.name ?? planned.exerciseId,
          total: progress.total,
          done: progress.done,
        };
      }),
    }));
  });

  protected open(exerciseId: string): void {
    const key = this.dayKey();
    if (key) {
      void this.router.navigate(['/entrenar', key, exerciseId]);
    }
  }
}
