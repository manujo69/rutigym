import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { DAY_LABELS, DayKey, todayKey } from '../../core/models';
import { RoutineStore } from '../../core/routine-store';

@Component({
  selector: 'app-train-page',
  imports: [RouterLink],
  templateUrl: './train.page.html',
  styleUrl: './train.page.scss',
})
export class TrainPage {
  protected readonly store = inject(RoutineStore);
  private readonly router = inject(Router);

  protected readonly labels = DAY_LABELS;
  protected readonly today = todayKey();
  protected readonly selections = computed(() => this.store.daySelections());
  protected readonly selected = signal<DayKey | null>(this.store.defaultDay());

  protected pick(day: DayKey): void {
    this.selected.set(day);
  }

  protected start(): void {
    const day = this.selected();
    if (day) {
      void this.router.navigate(['/entrenar', day]);
    }
  }
}
