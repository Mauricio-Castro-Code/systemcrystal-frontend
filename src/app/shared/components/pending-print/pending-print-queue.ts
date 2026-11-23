import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { filter, take } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { PendingPrint, PrintQueueService } from '../../../core/services/print-queue.service';
import { AppIconComponent } from '../app-icon/app-icon';
import { PendingPrintDialogComponent } from './pending-print-dialog';

@Component({
  selector: 'app-pending-print-queue',
  imports: [AppIconComponent],
  templateUrl: './pending-print-queue.html',
  styleUrl: './pending-print-queue.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingPrintQueueComponent {
  readonly queue = inject(PrintQueueService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly active = signal<PendingPrint | null>(null);
  private dialogRef: MatDialogRef<PendingPrintDialogComponent> | null = null;
  private destroyed = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    const router = inject(Router);
    effect(() => {
      if (this.auth.userSession() && !this.auth.isChofer())
        untracked(() => void this.queue.refresh());
    });
    effect(() => {
      const user = this.auth.userSession();
      const rows = this.queue.pending();
      const current = this.active();
      if (!user || this.auth.isChofer()) {
        this.closeDialog();
        return;
      }
      if (current) {
        const updated = rows.find(
          (row) => row.orderId === current.orderId && row.printVersion === current.printVersion,
        );
        if (!updated || (!current.printPostponedAt && updated.printPostponedAt)) this.closeDialog();
        else return;
      }
      if (!this.dialogRef) {
        const next = rows.find((row) => !row.printPostponedAt);
        if (next) this.resume(next);
      }
    });
    router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => void this.queue.refresh());
    const timer = window.setInterval(() => void this.queue.refresh(), 30_000);
    destroyRef.onDestroy(() => {
      this.destroyed = true;
      window.clearInterval(timer);
      this.closeDialog();
    });
  }

  @HostListener('window:focus')
  refresh(): void {
    void this.queue.refresh(true);
  }

  resume(note: PendingPrint): void {
    if (this.destroyed || this.dialogRef || !this.auth.userSession() || this.auth.isChofer())
      return;
    this.active.set(note);
    const ref = this.dialog.open(PendingPrintDialogComponent, {
      data: note,
      disableClose: true,
      closeOnNavigation: false,
      width: '580px',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: 'calc(100dvh - 24px)',
      ariaLabel: `Impresión pendiente de la nota ${note.orderId}`,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });
    this.dialogRef = ref;
    ref
      .afterClosed()
      .pipe(take(1))
      .subscribe(() => {
        if (this.dialogRef !== ref) return;
        this.dialogRef = null;
        this.active.set(null);
      });
  }

  private closeDialog(): void {
    const ref = this.dialogRef;
    this.dialogRef = null;
    this.active.set(null);
    ref?.close();
  }
}
