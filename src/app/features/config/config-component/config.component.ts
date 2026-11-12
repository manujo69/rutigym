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

  /** Backup text is only shown when the clipboard is not available. */
  protected readonly backupText = signal('');
  protected readonly importing = signal(false);
  protected readonly importText = signal('');
  protected readonly message = signal<{ kind: 'ok' | 'error'; text: string } | null>(null);

  protected clearPlan(): void {
    this.store.clearPlan();
    this.confirmingDelete.set(false);
  }

  protected async copyBackup(): Promise<void> {
    const json = this.store.exportBackup();
    try {
      await navigator.clipboard.writeText(json);
      this.backupText.set('');
      this.message.set({ kind: 'ok', text: 'Copia copiada. Pegala en el otro dispositivo.' });
    } catch {
      this.backupText.set(json);
      this.message.set({
        kind: 'error',
        text: 'No se pudo usar el portapapeles. Copiá el texto de abajo.',
      });
    }
  }

  protected startImport(): void {
    this.importing.set(true);
    this.importText.set('');
    this.message.set(null);
  }

  protected cancelImport(): void {
    this.importing.set(false);
    this.importText.set('');
  }

  protected async applyImport(): Promise<void> {
    const result = await this.store.importBackup(this.importText());
    if (!result.ok) {
      this.message.set({ kind: 'error', text: result.error });
      return;
    }

    this.importing.set(false);
    this.importText.set('');
    this.backupText.set('');
    this.message.set({
      kind: 'ok',
      text: `Plan importado: ${result.days} días y ${result.exercises} ejercicios.`,
    });
  }
}
