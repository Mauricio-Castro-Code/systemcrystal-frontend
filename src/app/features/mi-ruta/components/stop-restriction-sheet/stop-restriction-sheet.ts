import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DriverRouteStop } from '../../models/driver-route.model';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon';

@Component({
  selector: 'app-stop-restriction-sheet',
  imports: [FormsModule, AppIconComponent],
  templateUrl: './stop-restriction-sheet.html',
  styleUrl: './stop-restriction-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StopRestrictionSheetComponent {
  readonly stop = input.required<DriverRouteStop>();
  readonly saving = input(false);

  readonly save = output<string>();
  readonly remove = output<void>();
  readonly closed = output<void>();

  protected readonly noteText = signal('');

  protected readonly hasExistingRestriction = computed(() => {
    const stop = this.stop();
    return Boolean(stop.restrictionNote || stop.timeWindowStart || stop.timeWindowEnd);
  });

  protected readonly windowLabel = computed(() => {
    const stop = this.stop();
    if (!stop.timeWindowStart && !stop.timeWindowEnd) {
      return null;
    }
    if (stop.timeWindowStart && stop.timeWindowEnd) {
      return `${stop.timeWindowStart}–${stop.timeWindowEnd}`;
    }
    return stop.timeWindowStart ? `Después de ${stop.timeWindowStart}` : `Antes de ${stop.timeWindowEnd}`;
  });

  constructor() {
    // Cada vez que se abre la hoja para una parada distinta, precargamos su nota actual.
    effect(() => {
      this.noteText.set(this.stop().restrictionNote ?? '');
    });
  }

  protected onSave(): void {
    const note = this.noteText().trim();
    if (!note) {
      return;
    }
    this.save.emit(note);
  }

  protected onRemove(): void {
    this.remove.emit();
  }

  protected onClose(): void {
    this.closed.emit();
  }
}
