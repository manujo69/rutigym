import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { exerciseById } from '../../core/exercise-catalog';
import {
  DAY_ORDER,
  DayKey,
  KG_STEP,
  REPS_STEP,
  SetEntry,
  clampKg,
  clampReps,
} from '../../core/models';
import { RoutineStore } from '../../core/routine-store';

@Component({
  selector: 'app-exercise-log-page',
  imports: [RouterLink],
  templateUrl: './exercise-log.page.html',
  styleUrl: './exercise-log.page.scss',
})
export class ExerciseLogPage {
  private readonly store = inject(RoutineStore);
  private readonly router = inject(Router);

  readonly day = input.required<string>();
  readonly exerciseId = input.required<string>();

  protected readonly dayKey = computed<DayKey | null>(() => {
    const value = this.day() as DayKey;
    return DAY_ORDER.includes(value) ? value : null;
  });
  protected readonly exercise = computed(() => exerciseById(this.exerciseId()));
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
    this.patch(index, { reps: clampReps(this.entries()[index].reps + direction * REPS_STEP) });
  }

  protected adjustKg(index: number, direction: -1 | 1): void {
    this.patch(index, { kg: clampKg(this.entries()[index].kg + direction * KG_STEP) });
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
