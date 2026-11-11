import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DAY_LABELS } from '../../../core/models';
import { RoutineStore } from '../../../core/routine-store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-config',
  imports: [RouterLink],
  templateUrl: './config.component.html',
  styleUrl: './config.component.scss',
})
export class ConfigComponent {
  protected readonly store = inject(RoutineStore);
  protected readonly labels = DAY_LABELS;
  protected readonly confirmingDelete = signal(false);
  protected readonly selections = computed(() => this.store.daySelections());

  protected clearPlan(): void {
    this.store.clearPlan();
    this.confirmingDelete.set(false);
  }
}
