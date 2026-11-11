import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { GROUP_ORDER, exercisesOfGroup } from '../../core/exercise-catalog';
import { RoutineStore } from '../../core/routine-store';

@Component({
  selector: 'app-config-page',
  imports: [RouterLink],
  templateUrl: './config.page.html',
  styleUrl: './config.page.scss',
})
export class ConfigPage {
  protected readonly store = inject(RoutineStore);
  protected readonly confirmingDelete = signal(false);
  protected readonly sections = computed(() =>
    GROUP_ORDER.map((group) => ({ group, count: exercisesOfGroup(group).length })),
  );

  protected clearPlan(): void {
    this.store.clearPlan();
    this.confirmingDelete.set(false);
  }
}
