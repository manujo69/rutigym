import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DAY_LABELS } from '../../core/models';
import { RoutineStore } from '../../core/routine-store';

@Component({
  selector: 'app-config-page',
  imports: [RouterLink],
  templateUrl: './config.page.html',
  styleUrl: './config.page.scss',
})
export class ConfigPage {
  protected readonly store = inject(RoutineStore);
  protected readonly labels = DAY_LABELS;
  protected readonly confirmingDelete = signal(false);
  protected readonly selections = computed(() => this.store.daySelections());

  protected clearPlan(): void {
    this.store.clearPlan();
    this.confirmingDelete.set(false);
  }
}
