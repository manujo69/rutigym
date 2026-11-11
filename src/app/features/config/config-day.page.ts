import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { exerciseById } from '../../core/exercise-catalog';
import { DAY_LABELS, DAY_ORDER, DayKey } from '../../core/models';
import { RoutineStore } from '../../core/routine-store';

interface RoutineRow {
  readonly id: string;
  readonly name: string;
  readonly group: string;
  readonly series: number;
}

@Component({
  selector: 'app-config-day-page',
  imports: [RouterLink],
  templateUrl: './config-day.page.html',
  styleUrl: './config-day.page.scss',
})
export class ConfigDayPage {
  private readonly store = inject(RoutineStore);
  private readonly router = inject(Router);

  readonly day = input.required<string>();

  protected readonly labels = DAY_LABELS;
  protected readonly chips = computed(() => this.store.days());
  protected readonly dayKey = computed<DayKey | null>(() => {
    const value = this.day() as DayKey;
    return DAY_ORDER.includes(value) ? value : null;
  });
  protected readonly configured = computed(() => {
    const key = this.dayKey();
    return !!key && this.store.days().includes(key);
  });
  protected readonly dayLabel = computed(() => {
    const key = this.dayKey();
    return key ? DAY_LABELS[key].long : '';
  });
  protected readonly rows = computed<RoutineRow[]>(() => {
    const key = this.dayKey();
    if (!key) {
      return [];
    }
    return this.store.routinesFor(key).map((planned) => {
      const exercise = exerciseById(planned.exerciseId);
      return {
        id: planned.exerciseId,
        name: exercise?.name ?? planned.exerciseId,
        group: exercise?.group ?? '',
        series: planned.series,
      };
    });
  });
  protected readonly totalSeries = computed(() =>
    this.rows().reduce((total, row) => total + row.series, 0),
  );

  protected adjust(exerciseId: string, delta: number): void {
    const key = this.dayKey();
    if (!key || !this.configured()) {
      return;
    }
    this.store.setSeries(key, exerciseId, this.store.seriesFor(key, exerciseId) + delta);
  }

  protected remove(exerciseId: string): void {
    const key = this.dayKey();
    if (!key || !this.configured()) {
      return;
    }
    this.store.removeExercise(key, exerciseId);
  }

  protected addExercises(): void {
    void this.router.navigate(['/configurar/rutinas', this.day(), 'agregar']);
  }
}
