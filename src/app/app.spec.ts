import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the application frame with the router outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const frame = fixture.nativeElement.querySelector('.app-frame');

    expect(frame).not.toBeNull();
    expect(frame.querySelector('router-outlet')).not.toBeNull();
  });
});
