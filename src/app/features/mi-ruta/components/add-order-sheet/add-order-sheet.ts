import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { DriverRouteService } from '../../../../core/services/driver-route.service';
import { OrderRecordsService } from '../../../../core/services/order-records.service';
import { OrderRecord } from '../../../pedidos/models/order-record.model';

@Component({
  selector: 'app-add-order-sheet',
  imports: [FormsModule],
  templateUrl: './add-order-sheet.html',
  styleUrl: './add-order-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddOrderSheetComponent {
  private readonly orderRecordsService = inject(OrderRecordsService);
  private readonly driverRouteService = inject(DriverRouteService);

  readonly closed = output<void>();
  readonly added = output<void>();

  protected readonly folio = signal('');
  protected readonly searching = signal(false);
  protected readonly adding = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly foundOrder = signal<OrderRecord | null>(null);

  protected async search(): Promise<void> {
    const orderId = this.folio().trim();
    if (!orderId) {
      return;
    }

    this.searching.set(true);
    this.errorMessage.set('');
    this.foundOrder.set(null);

    try {
      const order = await this.orderRecordsService.loadOrderById(orderId, true);
      if (!order) {
        this.errorMessage.set(`No se encontró el pedido ${orderId}.`);
      } else {
        this.foundOrder.set(order);
      }
    } catch (error) {
      this.errorMessage.set(this.resolveErrorMessage(error));
    } finally {
      this.searching.set(false);
    }
  }

  protected async confirmAdd(): Promise<void> {
    const order = this.foundOrder();
    if (!order || this.adding()) {
      return;
    }

    this.adding.set(true);
    this.errorMessage.set('');

    try {
      await this.driverRouteService.addOrderByFolio(order.orderId);
      this.added.emit();
      this.onClose();
    } catch (error) {
      this.errorMessage.set(this.resolveErrorMessage(error));
    } finally {
      this.adding.set(false);
    }
  }

  protected onClose(): void {
    this.closed.emit();
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const detail = (error.error && (error.error.detail || error.error.message)) as
        | string
        | undefined;
      return detail || 'No se pudo completar la acción. Intenta de nuevo.';
    }
    return 'No se pudo completar la acción. Intenta de nuevo.';
  }
}
