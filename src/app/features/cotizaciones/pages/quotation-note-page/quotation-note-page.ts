import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { QuotationRecordsService } from '../../../../core/services/quotation-records.service';
import { FolioStrategyService } from '../../../../core/services/folio-strategy.service';
import { WhatsAppMessageDialogComponent } from '../../../../shared/components/whatsapp-message-dialog/whatsapp-message-dialog';

@Component({
  selector: 'app-quotation-note-page',
  imports: [CommonModule, CurrencyPipe, DatePipe, MatButtonModule, MatIconModule],
  templateUrl: './quotation-note-page.html',
  styleUrl: './quotation-note-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotationNotePageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quotationRecordsService = inject(QuotationRecordsService);
  private readonly folioStrategyService = inject(FolioStrategyService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly dialog = inject(MatDialog);
  private pdfObjectUrl: string | null = null;

  readonly quotationId = this.route.snapshot.paramMap.get('quotationId') ?? '';
  readonly quotationRecord = computed(() =>
    this.quotationRecordsService.getQuotationById(this.quotationId),
  );
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly isDownloadingPdf = signal(false);
  readonly isLoadingPdfPreview = signal(true);
  readonly loadErrorMessage = signal('');
  readonly pdfPreviewErrorMessage = signal('');
  readonly pdfPreviewUrl = signal<SafeResourceUrl | null>(null);

  constructor() {
    void this.loadQuotationRecord();
    void this.loadPdfPreview();
  }

  ngOnDestroy(): void {
    this.revokePdfPreview();
  }

  toDate(value: string | null): Date | null {
    if (!value) {
      return null;
    }

    const [year, month, day] = value.split('-').map(Number);

    if (!year || !month || !day) {
      return null;
    }

    return new Date(year, month - 1, day);
  }

  async goBack(): Promise<void> {
    await this.router.navigateByUrl('/cotizaciones/registro');
  }

  async goToEdit(): Promise<void> {
    await this.router.navigate(['/cotizaciones', this.quotationId, 'editar']);
  }

  async confirmOrder(): Promise<void> {
    const folioSelection = await this.folioStrategyService.resolve();

    if (folioSelection === null) {
      return;
    }

    this.isSubmitting.set(true);

    try {
      const createdOrder = await this.quotationRecordsService.confirmDraftAsOrder(
        this.quotationId,
        folioSelection,
      );

      if (!createdOrder) {
        await this.router.navigateByUrl('/cotizaciones/registro');
        return;
      }

      await this.router.navigate(['/pedidos', createdOrder.orderId]);
    } catch (error) {
      this.loadErrorMessage.set(
        error instanceof Error
          ? error.message
          : 'No fue posible confirmar la cotizacion seleccionada.',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async downloadPdf(): Promise<void> {
    this.isDownloadingPdf.set(true);

    try {
      await this.quotationRecordsService.downloadQuotationPdf(this.quotationId);
    } catch (error) {
      this.loadErrorMessage.set(
        error instanceof Error
          ? error.message
          : 'No fue posible descargar el PDF de la cotizacion.',
      );
    } finally {
      this.isDownloadingPdf.set(false);
    }
  }

  async refreshPdfPreview(): Promise<void> {
    await this.loadPdfPreview();
  }

  async sendWhatsApp(): Promise<void> {
    const record = this.quotationRecord();
    if (!record || typeof window === 'undefined') return;

    const name = record.quotation.clientInfo.fullName;
    const defaultMessage = `Hola ${name}, le compartimos su cotización ${record.quotationId}. Quedamos a sus órdenes.`;

    const ref = this.dialog.open(WhatsAppMessageDialogComponent, {
      width: '460px',
      data: { message: defaultMessage },
      autoFocus: false,
    });

    const editedMessage: string | null = await firstValueFrom(ref.afterClosed());

    if (!editedMessage) {
      return;
    }

    // Descarga el PDF para adjuntarlo manualmente en el chat.
    try {
      await this.quotationRecordsService.downloadQuotationPdf(this.quotationId);
    } catch (error) {
      this.loadErrorMessage.set(
        error instanceof Error
          ? error.message
          : 'No fue posible descargar el PDF de la cotizacion.',
      );
    }

    const rawPhone = record.quotation.clientInfo.phoneNumber ?? '';
    const digits = rawPhone.replace(/\D/g, '');
    const phone = digits.length === 10 ? `52${digits}` : digits;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(editedMessage)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  private async loadQuotationRecord(): Promise<void> {
    try {
      await this.quotationRecordsService.loadQuotationById(this.quotationId);
    } catch (error) {
      this.loadErrorMessage.set(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar la cotizacion solicitada.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadPdfPreview(): Promise<void> {
    if (!this.quotationId) {
      this.isLoadingPdfPreview.set(false);
      this.pdfPreviewErrorMessage.set('No se encontro la cotizacion solicitada.');
      return;
    }

    this.isLoadingPdfPreview.set(true);
    this.pdfPreviewErrorMessage.set('');

    try {
      const pdfBlob = await this.quotationRecordsService.getQuotationPdfBlob(
        this.quotationId,
      );
      this.setPdfPreviewBlob(pdfBlob);
    } catch (error) {
      this.revokePdfPreview();
      this.pdfPreviewErrorMessage.set(
        error instanceof Error
          ? error.message
          : 'No fue posible generar la vista previa del PDF.',
      );
    } finally {
      this.isLoadingPdfPreview.set(false);
    }
  }

  private setPdfPreviewBlob(pdfBlob: Blob): void {
    this.revokePdfPreview();
    this.pdfObjectUrl = URL.createObjectURL(pdfBlob);
    this.pdfPreviewUrl.set(
      this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfObjectUrl),
    );
  }

  private revokePdfPreview(): void {
    if (this.pdfObjectUrl && typeof URL !== 'undefined') {
      URL.revokeObjectURL(this.pdfObjectUrl);
    }

    this.pdfObjectUrl = null;
    this.pdfPreviewUrl.set(null);
  }
}
