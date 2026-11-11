import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { DAY_LABELS, DAY_ORDER, DayKey, formatDays, sortDays } from '../../../core/models';
import { RoutineStore } from '../../../core/routine-store';

const MIN_DAYS = 1;
const MAX_DAYS = 7;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-config-days',
  imports: [RouterLink],
  templateUrl: './config-days.component.html',
  styleUrl: './config-days.component.scss',
})
export class ConfigDaysComponent {
  private readonly store = inject(RoutineStore);
  private readonly router = inject(Router);

  protected readonly days = DAY_ORDER;
  protected readonly labels = DAY_LABELS;
  protected readonly count = signal(this.initialCount());
  protected readonly selected = signal<readonly DayKey[]>(this.initialSelection());

  protected readonly ready = computed(() => this.selected().length === this.count());
  protected readonly remaining = computed(() => this.count() - this.selected().length);
  protected readonly selectedLabel = computed(() => formatDays(this.selected()));

  protected setCount(next: number): void {
    const value = Math.min(MAX_DAYS, Math.max(MIN_DAYS, next));
    this.count.set(value);
    if (this.selected().length > value) {
      this.selected.set(sortDays(this.selected()).slice(0, value));
    }
  }

  protected isSelected(day: DayKey): boolean {
    return this.selected().includes(day);
  }

  protected toggle(day: DayKey): void {
    const current = this.selected();
    if (current.includes(day)) {
      this.selected.set(current.filter((item) => item !== day));
      return;
    }
    if (current.length >= this.count()) {
      return;
    }
    this.selected.set(sortDays([...current, day]));
  }

  protected continueSetup(): void {
    if (!this.ready()) {
      return;
    }
    const days = sortDays(this.selected());
    this.store.savePlan(days);
    void this.router.navigate(['/configurar/rutinas', days[0]]);
  }

  private initialCount(): number {
    const draft = this.store.draftDays() ?? this.store.days();
    return Math.min(MAX_DAYS, Math.max(MIN_DAYS, draft.length || 3));
  }

  private initialSelection(): readonly DayKey[] {
    return sortDays(this.store.draftDays() ?? this.store.days());
  }
}
