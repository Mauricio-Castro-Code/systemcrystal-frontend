import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ExportSection, SectionExportService } from '../../../core/services/section-export.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-section-export-button',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <button
      mat-stroked-button
      type="button"
      [disabled]="isExporting()"
      [attr.aria-busy]="isExporting()"
      (click)="download()"
    >
      <mat-icon>file_download</mat-icon>
      {{ isExporting() ? 'Preparando Excel…' : 'Exportar todo a Excel' }}
    </button>
    <span>ZIP con todos los registros de esta sección</span>
    <span class="export-status" role="status">{{ statusMessage() }}</span>
  `,
  styles: `
    :host {
      display: grid;
      gap: 0.4rem;
      justify-items: start;
      max-width: 100%;
    }
    button {
      min-height: 44px;
      border-radius: 10px;
    }
    span {
      color: var(--of-text-muted);
      font-size: 0.75rem;
    }
    .export-status {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionExportButtonComponent {
  readonly section = input.required<ExportSection>();
  readonly isExporting = signal(false);
  readonly statusMessage = signal('');
  private readonly exports = inject(SectionExportService);
  private readonly notifications = inject(NotificationService);

  async download(): Promise<void> {
    if (this.isExporting()) return;
    this.isExporting.set(true);
    this.statusMessage.set('Preparando el Excel de toda la sección.');
    try {
      await this.exports.download(this.section());
      this.statusMessage.set('Archivo listo. Descarga iniciada.');
      this.notifications.success(this.statusMessage());
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'No fue posible exportar.');
      this.notifications.error(this.statusMessage());
    } finally {
      this.isExporting.set(false);
    }
  }
}
