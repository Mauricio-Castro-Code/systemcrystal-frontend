import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { AuthService } from '../../../../core/services/auth.service';
import { OrderRecordsService } from '../../../../core/services/order-records.service';
import { TeamService } from '../../../../core/services/team.service';
import { WhatsAppMessageDialogComponent } from '../../../../shared/components/whatsapp-message-dialog/whatsapp-message-dialog';
import {
  OrderBillingStatus,
  OrderOperationalStatus,
} from '../../models/order-record.model';

const OPERATIONAL_STATUS_OPTIONS: Array<{
  value: OrderOperationalStatus;
  label: string;
}> = [
  { value: 'PROGRAMADA', label: 'Programada' },
  { value: 'EN_CAMINO', label: 'En camino' },
  { value: 'ENTREGADO', label: 'Entregado' },
  { value: 'POR_RECOGER', label: 'En Ruta' },
  { value: 'CLIENTE_ENTREGA', label: 'Cliente entrega' },
  { value: 'RECOGIDO', label: 'Recogido' },
];

const BILLING_STATUS_OPTIONS: Array<{
  value: OrderBillingStatus;
  label: string;
}> = [
  { value: 'AL_CORRIENTE', label: 'Al corriente' },
  { value: 'POR_COBRAR', label: 'Por cobrar' },
  { value: 'COBRADO', label: 'Cobrado' },
];

@Component({
  selector: 'app-order-note-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './order-note-page.html',
  styleUrl: './order-note-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderNotePageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderRecordsService = inject(OrderRecordsService);
  private readonly authService = inject(AuthService);
  private readonly teamService = inject(TeamService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly dialog = inject(MatDialog);

  readonly isAdmin = this.authService.isAdmin;
  readonly canAssignDriver = this.authService.canAssignDriver;
  // Solo los choferes activos pueden recibir asignaciones.
  readonly assignableDrivers = computed(() =>
    this.teamService.members().filter((member) => member.role === 'chofer' && member.isActive),
  );
  readonly driverControl = new FormControl<number | null>(null);
  readonly mapsUrlControl = new FormControl('', { nonNullable: true });
  readonly isSavingAssignment = signal(false);
  readonly assignmentMessage = signal('');
  readonly isTogglingCancel = signal(false);
  private pdfObjectUrl: string | null = null;

  readonly orderId = this.route.snapshot.paramMap.get('orderId') ?? '';
  readonly isArchiveRoute = signal(this.router.url.startsWith('/pedidos/registro'));
  readonly orderRecord = computed(() => this.orderRecordsService.getOrderById(this.orderId));
  readonly isLoading = signal(true);
  readonly isDownloadingPdf = signal(false);
  readonly isDownloadingExcel = signal(false);
  readonly isLoadingPdfPreview = signal(true);
  readonly loadErrorMessage = signal('');
  readonly workflowMessage = signal('');
  readonly isSavingWorkflow = signal(false);
  readonly pdfPreviewErrorMessage = signal('');
  readonly pdfPreviewUrl = signal<SafeResourceUrl | null>(null);
  readonly sectionLabel = computed(() =>
    this.isArchiveRoute() ? 'Registro Notas' : 'Notas Activas',
  );
  readonly backLabel = computed(() =>
    this.isArchiveRoute() ? 'Volver al Archivo' : 'Volver a Notas Activas',
  );
  readonly operationalStatusOptions = OPERATIONAL_STATUS_OPTIONS;
  readonly billingStatusOptions = BILLING_STATUS_OPTIONS;
  readonly operationalStatusControl = new FormControl<OrderOperationalStatus>('PROGRAMADA', {
    nonNullable: true,
  });
  readonly billingStatusControl = new FormControl<OrderBillingStatus>('AL_CORRIENTE', {
    nonNullable: true,
  });
  readonly workflowCommentControl = new FormControl('', { nonNullable: true });

  // Una nota es asignable solo si está activa: no archivada, no recogida, no cancelada.
  readonly isActiveNote = computed(() => {
    const record = this.orderRecord();
    return (
      !this.isArchiveRoute() &&
      !!record &&
      !record.isCancelled &&
      record.operationalStatus !== 'RECOGIDO'
    );
  });

  constructor() {
    effect(() => {
      const record = this.orderRecord();

      if (!record) {
        return;
      }

      this.operationalStatusControl.setValue(record.operationalStatus, {
        emitEvent: false,
      });
      this.billingStatusControl.setValue(record.billingStatus, {
        emitEvent: false,
      });

      if (!this.isSavingAssignment()) {
        this.driverControl.setValue(record.assignedDriver?.id ?? null, { emitEvent: false });
        this.mapsUrlControl.setValue(record.mapsUrl ?? '', { emitEvent: false });
      }

      if (!this.isSavingWorkflow()) {
        this.workflowCommentControl.setValue('', { emitEvent: false });
      }
    });

    if (this.authService.canAssignDriver()) {
      void this.teamService.loadMembers();
    }

    void this.loadOrderRecord();
    void this.loadPdfPreview();
  }

  async saveAssignment(): Promise<void> {
    const record = this.orderRecord();

    if (!record) {
      return;
    }

    const driverId = this.driverControl.value ?? null;
    const mapsUrl = this.mapsUrlControl.value.trim();

    this.isSavingAssignment.set(true);
    this.assignmentMessage.set('');

    try {
      await this.orderRecordsService.assignOrder(record.orderId, { driverId, mapsUrl });

      const driverName =
        this.assignableDrivers().find((driver) => Number(driver.id) === driverId)?.displayName ?? '';
      this.assignmentMessage.set(
        driverId
          ? `Nota asignada a ${driverName}.`
          : 'Chofer desasignado de la nota.',
      );
    } catch (error) {
      this.assignmentMessage.set(
        error instanceof Error ? error.message : 'No fue posible guardar la asignación.',
      );
    } finally {
      this.isSavingAssignment.set(false);
    }
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
    await this.router.navigateByUrl(
      this.isArchiveRoute() ? '/pedidos/registro' : '/pedidos',
    );
  }

  async goToEdit(): Promise<void> {
    await this.router.navigate(['/pedidos', this.orderId, 'editar']);
  }

  async duplicateInNewQuotation(): Promise<void> {
    // Abre una cotización nueva prellenada con la info de esta nota.
    await this.router.navigate(['/cotizaciones', 'nueva'], {
      queryParams: { duplicarDe: this.orderId },
    });
  }

  async toggleCancel(): Promise<void> {
    const record = this.orderRecord();
    if (!record) return;
    const newState = !record.isCancelled;
    if (newState && !confirm(`¿Cancelar la nota ${record.orderId}? Dejará de contar en contabilidad pero quedará en el registro.`)) return;
    this.isTogglingCancel.set(true);
    try {
      await this.orderRecordsService.setCancelled(record.orderId, newState);
    } finally {
      this.isTogglingCancel.set(false);
    }
  }

  async downloadPdf(): Promise<void> {
    this.isDownloadingPdf.set(true);
    this.loadErrorMessage.set('');

    try {
      await this.orderRecordsService.downloadOrderPdf(this.orderId);
    } catch (error) {
      this.loadErrorMessage.set(
        error instanceof Error
          ? error.message
          : 'No fue posible descargar el PDF de la nota.',
      );
    } finally {
      this.isDownloadingPdf.set(false);
    }
  }

  async downloadExcel(): Promise<void> {
    this.isDownloadingExcel.set(true);
    this.loadErrorMessage.set('');

    try {
      await this.orderRecordsService.downloadOrderExcel(this.orderId);
    } catch (error) {
      this.loadErrorMessage.set(
        error instanceof Error
          ? error.message
          : 'No fue posible descargar el Excel de la nota.',
      );
    } finally {
      this.isDownloadingExcel.set(false);
    }
  }

  async refreshPdfPreview(): Promise<void> {
    await this.loadPdfPreview();
  }

  async sendWhatsApp(): Promise<void> {
    const record = this.orderRecord();
    if (!record || typeof window === 'undefined') return;

    const name = record.quotation.clientInfo.fullName;
    const defaultMessage = `Hola ${name}, le compartimos la nota de su pedido ${record.orderId}. Quedo a sus órdenes.`;

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
      await this.orderRecordsService.downloadOrderPdf(this.orderId);
    } catch (error) {
      this.loadErrorMessage.set(
        error instanceof Error
          ? error.message
          : 'No fue posible descargar el PDF de la nota.',
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

  async saveWorkflowChanges(): Promise<void> {
    const record = this.orderRecord();

    if (!record) {
      return;
    }

    const operationalStatus = this.operationalStatusControl.value;
    const billingStatus = this.billingStatusControl.value;
    const comment = this.workflowCommentControl.value.trim();

    if (
      operationalStatus === record.operationalStatus &&
      billingStatus === record.billingStatus
    ) {
      this.workflowMessage.set(
        'Selecciona un nuevo estado operativo o de cobranza para mover la nota.',
      );
      return;
    }

    this.isSavingWorkflow.set(true);
    this.workflowMessage.set('');

    try {
      const updatedOrder = await this.orderRecordsService.updateOrderStatuses(record.orderId, {
        operationalStatus,
        billingStatus,
        comment,
      });

      this.workflowMessage.set(
        `La nota ${updatedOrder.orderId} ya quedo actualizada en sus carpetas operativas.`,
      );
      this.workflowCommentControl.setValue('', { emitEvent: false });
    } catch (error) {
      this.workflowMessage.set(
        error instanceof Error
          ? error.message
          : 'No fue posible actualizar los estados de la nota.',
      );
    } finally {
      this.isSavingWorkflow.set(false);
    }
  }

  hasWorkflowChanges(): boolean {
    const record = this.orderRecord();

    if (!record) {
      return false;
    }

    return (
      this.operationalStatusControl.value !== record.operationalStatus ||
      this.billingStatusControl.value !== record.billingStatus
    );
  }

  private async loadOrderRecord(): Promise<void> {
    try {
      await this.orderRecordsService.loadOrderById(this.orderId, true);
    } catch (error) {
      this.loadErrorMessage.set(
        error instanceof Error ? error.message : 'No se pudo cargar el pedido solicitado.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadPdfPreview(): Promise<void> {
    if (!this.orderId) {
      this.isLoadingPdfPreview.set(false);
      this.pdfPreviewErrorMessage.set('No se encontro la nota solicitada.');
      return;
    }

    this.isLoadingPdfPreview.set(true);
    this.pdfPreviewErrorMessage.set('');

    try {
      const pdfBlob = await this.orderRecordsService.getOrderPdfBlob(this.orderId);
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
