import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { GROUP_ORDER, exercisesOfGroup } from '../../../core/exercise-catalog';
import { DAY_LABELS, DAY_ORDER, DayKey } from '../../../core/models';
import { RoutineStore } from '../../../core/routine-store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-config-add-exercises',
  imports: [RouterLink],
  templateUrl: './config-add-exercises.component.html',
  styleUrl: './config-add-exercises.component.scss',
})
export class ConfigAddExercisesComponent {
  private readonly store = inject(RoutineStore);
  private readonly router = inject(Router);

  readonly day = input.required<string>();

  protected readonly groups = GROUP_ORDER.map((group) => ({
    group,
    exercises: exercisesOfGroup(group),
  }));
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
  protected readonly selected = signal<ReadonlySet<string>>(new Set<string>());
  protected readonly count = computed(() => this.selected().size);

  protected isSelected(exerciseId: string): boolean {
    return this.selected().has(exerciseId);
  }

  protected isAdded(exerciseId: string): boolean {
    const key = this.dayKey();
    return !!key && this.store.isPlanned(key, exerciseId);
  }

  protected toggle(exerciseId: string): void {
    if (this.isAdded(exerciseId)) {
      return;
    }
    this.selected.update((current) => {
      const next = new Set(current);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  }

  protected addSelected(): void {
    const key = this.dayKey();
    if (!key || !this.configured() || this.count() === 0) {
      return;
    }
    for (const exerciseId of this.selected()) {
      this.store.addExercise(key, exerciseId);
    }
    void this.router.navigate(['/configurar/rutinas', key]);
  }
}
