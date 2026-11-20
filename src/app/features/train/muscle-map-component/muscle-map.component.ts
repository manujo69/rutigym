import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/** Muscles drawn on the front view of `public/muscles/front.svg`. */
const FRONT = new Set([
  'pecho',
  'deltoides frontales',
  'biceps',
  'antebrazos',
  'abdominales',
  'oblicuos',
  'cuadriceps',
]);

/** Muscles drawn on the back view of `public/muscles/back.svg`. */
const BACK = new Set([
  'dorsales',
  'trapecios',
  'triceps',
  'deltoides posteriores',
  'lumbares',
  'gluteos',
  'isquiotibiales',
  'gemelos',
]);

export type MuscleView = 'front' | 'back';

/**
 * The view that shows the primary muscle. The catalog lists the main muscle first, so the view is
 * chosen from it; secondary muscles never change the view. Without a recognisable primary the
 * fallback is the view with more worked muscles, ties to the front.
 */
export function pickView(muscles: readonly string[]): MuscleView {
  const primary = muscles[0];
  if (primary && BACK.has(primary)) {
    return 'back';
  }
  if (primary && FRONT.has(primary)) {
    return 'front';
  }

  const front = muscles.filter((muscle) => FRONT.has(muscle)).length;
  const back = muscles.filter((muscle) => BACK.has(muscle)).length;
  return back > front ? 'back' : 'front';
}

/** Marks the paths of the worked muscles so CSS can paint them. */
export function highlightMuscles(svg: string, muscles: readonly string[]): string {
  const wanted = new Set(muscles);
  return svg.replace(/<path\b[^>]*>/g, (tag) => {
    const match = /data-muscle="([^"]+)"/.exec(tag);
    if (!match || !wanted.has(match[1])) {
      return tag;
    }
    return tag.replace(/fill="#[0-9A-Fa-f]{6}"/, 'fill="currentColor"');
  });
}

interface Box {
  readonly muscle: string | null;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function pathBox(tag: string): Omit<Box, 'muscle'> | null {
  const data = /d="([^"]+)"/.exec(tag)?.[1];
  if (!data) {
    return null;
  }
  const numbers = [...data.matchAll(/-?\d+\.?\d*(?:e-?\d+)?/g)].map((match) =>
    Number(match[0]),
  );
  const xs = numbers.filter((_, index) => index % 2 === 0);
  const ys = numbers.filter((_, index) => index % 2 === 1);
  if (xs.length === 0 || ys.length === 0) {
    return null;
  }
  const offset = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(tag);
  const dx = offset ? Number(offset[1]) : 0;
  const dy = offset ? Number(offset[2]) : 0;
  const minX = Math.min(...xs) + dx;
  const minY = Math.min(...ys) + dy;
  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) + dx - minX,
    height: Math.max(...ys) + dy - minY,
  };
}

function boxes(svg: string): Box[] {
  return [...svg.matchAll(/<path\b[^>]*>/g)]
    .map((match) => {
      const box = pathBox(match[0]);
      const muscle = /data-muscle="([^"]+)"/.exec(match[0])?.[1] ?? null;
      return box ? { ...box, muscle } : null;
    })
    .filter((box): box is Box => box !== null);
}

/**
 * Re-encuadra el `viewBox` sobre las regiones trabajadas, en un cuadrado con margen,
 * para que el óvalo muestre el músculo y no siempre el torso.
 */
export function frameMuscles(svg: string, muscles: readonly string[]): string {
  const wanted = new Set(muscles);
  const selected = boxes(svg).filter((box) => box.muscle && wanted.has(box.muscle));
  if (selected.length === 0) {
    return svg;
  }

  const left = Math.min(...selected.map((box) => box.x));
  const top = Math.min(...selected.map((box) => box.y));
  const right = Math.max(...selected.map((box) => box.x + box.width));
  const bottom = Math.max(...selected.map((box) => box.y + box.height));

  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const side = Math.max(right - left, bottom - top) * 1.6;
  const half = side / 2;
  const viewBox = [centerX - half, centerY - half, side, side]
    .map((value) => value.toFixed(1))
    .join(' ');

  return svg.replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`);
}

/**
 * Small muscle diagram: shows the front or back view and paints the worked muscles.
 * The SVG lives in `public/muscles/` and only the worked paths are recoloured.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-muscle-map',
  template: '<span class="muscle-map__figure" [innerHTML]="svg()"></span>',
  styleUrl: './muscle-map.component.scss',
})
export class MuscleMapComponent {
  private readonly sanitizer = inject(DomSanitizer);
  /** Loaded views, cached per component so the state does not leak between instances. */
  private readonly loaded = new Map<MuscleView, Promise<string>>();

  readonly muscles = input.required<readonly string[]>();

  protected readonly view = computed<MuscleView>(() => pickView(this.muscles()));
  private readonly source = signal<string>('');
  protected readonly svg = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(
      frameMuscles(highlightMuscles(this.source(), this.muscles()), this.muscles()),
    ),
  );

  constructor() {
    effect(() => {
      const view = this.view();
      let active = true;
      void this.load(view).then((text) => {
        if (active) {
          this.source.set(text);
        }
      });
      return () => {
        active = false;
      };
    });
  }

  private load(view: MuscleView): Promise<string> {
    const cached = this.loaded.get(view);
    if (cached) {
      return cached;
    }
    const request = fetch(`/muscles/${view}.svg`)
      .then((response) => response.text())
      .catch(() => '');
    this.loaded.set(view, request);
    return request;
  }
}
