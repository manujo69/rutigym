import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { EXERCISES, GROUP_ORDER, exercisesOfGroup } from '../../core/exercise-catalog';
import { DEFAULT_SERIES, MAX_SERIES, MIN_SERIES, formatDays } from '../../core/models';
import { RoutineStore } from '../../core/routine-store';

@Component({
  selector: 'app-config-exercises-page',
  imports: [RouterLink],
  templateUrl: './config-exercises.page.html',
  styleUrl: './config-exercises.page.scss',
})
export class ConfigExercisesPage {
  private readonly store = inject(RoutineStore);
  private readonly router = inject(Router);

  protected readonly groups = GROUP_ORDER.map((group) => ({
    group,
    exercises: exercisesOfGroup(group),
  }));
  protected readonly days = this.store.draftDays() ?? this.store.days();
  protected readonly daysLabel = formatDays(this.days);
  protected readonly canSave = this.days.length > 0;
  protected readonly series = signal<Record<string, number>>(this.initialSeries());
  protected readonly totalSeries = computed(() =>
    Object.values(this.series()).reduce((total, value) => total + value, 0),
  );

  protected seriesFor(exerciseId: string): number {
    return this.series()[exerciseId] ?? DEFAULT_SERIES;
  }

  protected adjust(exerciseId: string, delta: number): void {
    const next = Math.min(MAX_SERIES, Math.max(MIN_SERIES, this.seriesFor(exerciseId) + delta));
    this.series.update((current) => ({ ...current, [exerciseId]: next }));
  }

  protected save(): void {
    if (!this.canSave) {
      void this.router.navigate(['/configurar/dias']);
      return;
    }
    this.store.savePlan(this.days, this.series());
    void this.router.navigate(['/configurar']);
  }

  private initialSeries(): Record<string, number> {
    const map: Record<string, number> = {};
    for (const exercise of EXERCISES) {
      map[exercise.id] = this.store.seriesFor(exercise.id);
    }
    return map;
  }
}
