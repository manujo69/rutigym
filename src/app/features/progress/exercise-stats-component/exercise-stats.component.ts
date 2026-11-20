import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { exerciseById } from '../../../core/exercise-catalog';
import { DAY_LABELS, formatKg, parseIsoDate } from '../../../core/models';
import {
  ExerciseHistoryEntry,
  exerciseHistory,
  oneRepMax,
  setVolume,
} from '../../../core/session-stats';
import { RoutineStore } from '../../../core/routine-store';

interface ChartBar {
  readonly x: number;
  readonly path: string;
  readonly badgeX: number;
  readonly badgeY: number;
  readonly reps: number;
  readonly best: boolean;
}

interface ChartGroup {
  readonly label: string;
  readonly center: number;
  readonly bars: readonly ChartBar[];
}

const WIDTH = 360;
const LEFT = 36;
const RIGHT = 352;
const TOP = 12;
const BOTTOM = 150;
const BAR_W = 14;
const GAP = 5;
const GROUP_GAP = 14;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exercise-stats',
  templateUrl: './exercise-stats.component.html',
  styleUrl: './exercise-stats.component.scss',
})
export class ExerciseStatsComponent {
  private readonly store = inject(RoutineStore);

  readonly exerciseId = input.required<string>();
  readonly closed = output<void>();

  protected readonly exercise = computed(() => exerciseById(this.exerciseId()));
  protected readonly history = computed<ExerciseHistoryEntry[]>(() =>
    exerciseHistory(this.store.sessions(), this.exerciseId()),
  );
  protected readonly bestRm = computed(() =>
    this.history().reduce((max, entry) => Math.max(max, entry.bestRm), 0),
  );
  protected readonly totalVolume = computed(() =>
    this.history().reduce((total, entry) => total + entry.volume, 0),
  );
  protected readonly sessions = computed(() => this.history().length);
  protected readonly axisMax = computed(() => {
    const max = this.history().reduce(
      (value, entry) => Math.max(value, ...entry.sets.map((set) => set.kg)),
      0,
    );
    return Math.max(10, Math.ceil(max / 10) * 10);
  });
  protected readonly gridLines = computed(() =>
    Array.from({ length: this.axisMax() / 10 }, (_, index) => {
      const kg = (index + 1) * 10;
      return { kg, y: this.yFor(kg) };
    }),
  );
  /** Cuántas sesiones entran manteniendo el ancho de columna. */
  protected readonly visible = computed(() => {
    const slot = BAR_W * 3 + GAP * 2 + GROUP_GAP;
    const fit = Math.max(1, Math.floor((RIGHT - LEFT) / slot));
    return this.history().slice(-fit);
  });
  protected readonly chart = computed<ChartGroup[]>(() => {
    const entries = this.visible();
    const slot = (RIGHT - LEFT) / entries.length;
    return entries.map((entry, position) => {
      const center = LEFT + slot * (position + 0.5);
      const start = center - (BAR_W * 3 + GAP * 2) / 2;
      const best = entry.sets.reduce(
        (index, set, setIndex) => (set.rm > (entry.sets[index]?.rm ?? 0) ? setIndex : index),
        0,
      );
      return {
        label: this.shortDate(entry.date),
        center,
        bars: entry.sets.slice(0, 3).map((set, index) => {
          const x = start + index * (BAR_W + GAP);
          const y = this.yFor(set.kg);
          const radius = BAR_W / 2;
          return {
            x,
            path:
              `M${x.toFixed(1)},${BOTTOM} L${x.toFixed(1)},${(y + radius).toFixed(1)} ` +
              `A${radius},${radius} 0 0 1 ${(x + BAR_W).toFixed(1)},${(y + radius).toFixed(1)} ` +
              `L${(x + BAR_W).toFixed(1)},${BOTTOM} Z`,
            badgeX: x + BAR_W / 2,
            badgeY: y + 18,
            reps: set.reps,
            best: index === best,
          };
        }),
      };
    });
  });
  protected readonly rows = computed(() =>
    [...this.history()]
      .reverse()
      .slice(0, 6)
      .map((entry, index, all) => {
        const previous = all[index + 1];
        const best = entry.sets[entry.bestIndex - 1];
        return {
          date: this.shortDate(entry.date),
          set: best ? `${formatKg(best.kg)} kg × ${best.reps}` : '—',
          rm: entry.bestRm,
          delta: previous ? entry.bestRm - previous.bestRm : 0,
        };
      }),
  );

  protected readonly blues = ['#2f57e0', '#3c6bf5', '#9db3ff'];
  protected readonly width = WIDTH;
  protected readonly bottom = BOTTOM;
  protected readonly left = LEFT;
  protected readonly right = RIGHT;
  protected readonly barWidth = BAR_W;

  protected format(value: number): string {
    return formatKg(value);
  }

  protected close(): void {
    this.closed.emit();
  }

  private yFor(kg: number): number {
    return BOTTOM - (kg / this.axisMax()) * (BOTTOM - TOP);
  }

  private shortDate(iso: string): string {
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
      .format(parseIsoDate(iso))
      .replace('.', '')
      .toUpperCase();
  }
}
