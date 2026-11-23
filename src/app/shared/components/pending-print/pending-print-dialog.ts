import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../../core/services/auth.service';
import { OrderRecordsService } from '../../../core/services/order-records.service';
import { PendingPrint, PrintQueueService } from '../../../core/services/print-queue.service';
import { AppIconComponent } from '../app-icon/app-icon';

@Component({
  selector: 'app-pending-print-dialog',
  imports: [FormsModule, MatDialogModule, AppIconComponent],
  templateUrl: './pending-print-dialog.html',
  styleUrl: './pending-print-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingPrintDialogComponent {
  readonly note = inject<PendingPrint>(MAT_DIALOG_DATA);
  readonly isAdmin = inject(AuthService).isAdmin;
  private readonly queue = inject(PrintQueueService);
  private readonly records = inject(OrderRecordsService);
  private readonly dialog = inject(MatDialogRef<PendingPrintDialogComponent>);
  private destroyed = false;
  readonly busy = signal(false);
  readonly error = signal('');
  readonly reason = signal('');
  readonly confirmed = signal(false);
  readonly showPostpone = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
    });
  }

  async openPdf(): Promise<void> {
    if (this.busy()) return;
    this.error.set('');
    // Reserve the tab during the click so browsers do not block an asynchronous popup.
    const popup = window.open('', '_blank');
    if (!popup) {
      this.error.set(
        'Permite abrir ventanas para ver e imprimir el PDF. Después vuelve a intentar.',
      );
      return;
    }
    popup.opener = null;
    this.busy.set(true);
    try {
      const blob = await this.queue.getPdf(this.note);
      if (this.destroyed) {
        popup.close();
        return;
      }
      const url = URL.createObjectURL(blob);
      popup.location.replace(url);
      // Give the PDF tab time to load, including on mobile browsers.
      window.setTimeout(() => URL.revokeObjectURL(url), 300_000);
    } catch (error) {
      popup.close();
      this.error.set(this.message(error));
    } finally {
      this.busy.set(false);
    }
  }

  async confirmPrinted(): Promise<void> {
    if (this.busy() || !this.confirmed()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.records.setPrinted(this.note.orderId, true, this.note.printVersion);
      if (!this.destroyed) this.dialog.close();
    } catch (error) {
      this.error.set(this.message(error));
      void this.queue.refresh();
    } finally {
      this.busy.set(false);
    }
  }

  async postpone(): Promise<void> {
    const reason = this.reason().trim();
    if (this.busy() || !this.isAdmin()) return;
    if (!reason || reason.length > 500) {
      this.error.set('Escribe un motivo de hasta 500 caracteres para posponer.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const status = await this.queue.postpone(this.note, reason);
      this.records.applyPrintStatus(this.note.orderId, status);
      if (!this.destroyed) this.dialog.close();
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.busy.set(false);
    }
  }

  private message(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'No fue posible guardar el cambio. Vuelve a intentar.';
  }
}
