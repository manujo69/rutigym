import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RoutineStore } from '../../core/routine-store';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  protected readonly store = inject(RoutineStore);
}
