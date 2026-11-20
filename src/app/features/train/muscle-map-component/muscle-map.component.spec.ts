import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  MuscleMapComponent,
  frameMuscles,
  highlightMuscles,
  pickView,
} from './muscle-map.component';

const SVG =
  '<svg viewBox="0 0 1000 1000">' +
  '<path data-muscle="pecho" fill="#FFFFFF" d="M100 100L200 100L200 200L100 200Z"/>' +
  '<path data-muscle="gemelos" fill="#FFFFFF" d="M700 800L760 800L760 900L700 900Z"/>' +
  '<path fill="#000000" d="M0 0L10 0L10 10Z"/></svg>';

describe('MuscleMapComponent', () => {
  let fixture: ComponentFixture<MuscleMapComponent>;

  beforeEach(() => {
    spyOn(window, 'fetch').and.resolveTo(new Response(SVG));

    TestBed.configureTestingModule({ imports: [MuscleMapComponent] });
    fixture = TestBed.createComponent(MuscleMapComponent);
  });

  it('shows the view that holds more of the worked muscles', () => {
    expect(pickView(['dorsales', 'gluteos'])).toBe('back');
    expect(pickView(['pecho', 'biceps'])).toBe('front');
  });

  it('picks the view of the primary muscle, whatever the secondary ones are', () => {
    expect(pickView(['dorsales', 'biceps'])).toBe('back');
    expect(pickView(['biceps', 'dorsales'])).toBe('front');
    expect(pickView(['pecho', 'triceps'])).toBe('front');
  });

  it('falls back to the front view when nothing identifies the primary', () => {
    expect(pickView([])).toBe('front');
    expect(pickView(['desconocido'])).toBe('front');
  });

  it('only repaints the worked muscles', () => {
    const result = highlightMuscles(SVG, ['pecho']);

    expect(result).toContain('<path data-muscle="pecho" fill="currentColor"');
    expect(result).toContain('<path data-muscle="gemelos" fill="#FFFFFF"');
    expect(result).toContain('<path fill="#000000"');
  });

  it('frames the worked muscles instead of the whole figure', () => {
    const framed = frameMuscles(SVG, ['gemelos']);
    const viewBox = /viewBox="([^"]+)"/.exec(framed)?.[1].split(' ').map(Number) ?? [];

    // Centro del gemelo (730, 850) y lado 100 × 1,6 = 160.
    expect(viewBox[0]).toBeCloseTo(650, 0);
    expect(viewBox[1]).toBeCloseTo(770, 0);
    expect(viewBox[2]).toBeCloseTo(160, 0);
  });

  it('leaves the drawing untouched when no muscle matches', () => {
    expect(frameMuscles(SVG, ['lumbares'])).toBe(SVG);
  });

  it('loads the matching view and renders it', async () => {
    fixture.componentRef.setInput('muscles', ['gemelos']);
    fixture.detectChanges();

    let html = '';
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
      html = fixture.nativeElement.innerHTML as string;
      if (html.includes('data-muscle="gemelos"')) {
        break;
      }
    }

    expect(window.fetch).toHaveBeenCalledWith('/muscles/back.svg');
    expect(html).toContain('data-muscle="gemelos"');
    expect(html).toContain('currentColor');
  });
});
