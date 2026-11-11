import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { exerciseById } from '../../core/exercise-catalog';
import { DAY_ORDER, DayKey, SetEntry } from '../../core/models';
import { RoutineStore } from '../../core/routine-store';

function readNumber(event: Event): number | null {
  const raw = (event.target as HTMLInputElement).value.trim().replace(',', '.');
  if (raw === '') {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

@Component({
  selector: 'app-exercise-log-page',
  imports: [RouterLink],
  templateUrl: './exercise-log.page.html',
  styleUrl: './exercise-log.page.scss',
})
export class ExerciseLogPage implements OnInit {
  protected readonly store = inject(RoutineStore);
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
  protected readonly entries = signal<readonly SetEntry[]>([]);
  protected readonly doneCount = computed(
    () => this.entries().filter((entry) => entry.done).length,
  );
  protected readonly percent = computed(() => {
    const total = this.entries().length;
    return total === 0 ? 0 : Math.round((this.doneCount() / total) * 100);
  });

  ngOnInit(): void {
    const day = this.dayKey();
    this.entries.set(day ? this.store.setsFor(day, this.exerciseId()) : []);
  }

  protected setReps(index: number, event: Event): void {
    this.patch(index, { reps: readNumber(event) });
  }

  protected setKg(index: number, event: Event): void {
    this.patch(index, { kg: readNumber(event) });
  }

  protected toggleDone(index: number): void {
    const entry = this.entries()[index];
    this.patch(index, { done: !entry.done });
  }

  protected save(): void {
    const day = this.dayKey();
    if (!day) {
      return;
    }
    this.store.saveSets(day, this.exerciseId(), this.entries());
    void this.router.navigate(['/entrenar', day]);
  }

  private patch(index: number, changes: Partial<SetEntry>): void {
    this.entries.update((current) =>
      current.map((entry, position) => (position === index ? { ...entry, ...changes } : entry)),
    );
  }
}
