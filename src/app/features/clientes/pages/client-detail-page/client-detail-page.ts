import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { ClientDirectoryService } from '../../../../core/services/client-directory.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ClientProfile, ClientAddressHistoryItem } from '../../models/client-profile.model';
import {
  AddressPickerDialogComponent,
  AddressPickerResult,
} from '../../../../shared/components/address-picker-dialog/address-picker-dialog';
import {
  ClientFormDialogComponent,
  ClientFormResult,
} from '../../../../shared/components/client-form-dialog/client-form-dialog';
import {
  ClientAddressFormDialogComponent,
  ClientAddressFormResult,
} from '../../../../shared/components/client-address-form-dialog/client-address-form-dialog';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { NotificationService } from '../../../../shared/services/notification.service';

@Component({
  selector: 'app-client-detail-page',
  imports: [CommonModule, CurrencyPipe, DatePipe, MatButtonModule, MatIconModule],
  templateUrl: './client-detail-page.html',
  styleUrl: './client-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clientDirectoryService = inject(ClientDirectoryService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly confirmService = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);

  readonly clientId = this.route.snapshot.paramMap.get('clientId') ?? '';
  readonly clientProfile = signal<ClientProfile | null>(null);
  readonly isLoading = signal(true);
  readonly isMutating = signal(false);
  readonly errorMessage = signal('');
  readonly addressCount = computed(() => this.clientProfile()?.addresses.length ?? 0);
  readonly orderCount = computed(() => this.clientProfile()?.orderHistory.length ?? 0);
  readonly isAdmin = this.authService.isAdmin;

  constructor() {
    void this.loadClientProfile();
  }

  async goBack(): Promise<void> {
    await this.router.navigateByUrl('/clientes');
  }

  async editClientInfo(): Promise<void> {
    const profile = this.clientProfile();
    if (!profile) return;

    const ref = this.dialog.open(ClientFormDialogComponent, {
      width: '420px',
      autoFocus: false,
      data: {
        mode: 'edit',
        clientName: profile.clientName,
        phoneNumber: profile.phoneNumber,
        email: profile.email,
      },
    });

    const result = (await firstValueFrom(ref.afterClosed())) as ClientFormResult | null;
    if (!result) return;

    this.isMutating.set(true);
    try {
      const updated = await this.clientDirectoryService.updateClient(this.clientId, result);
      this.clientProfile.set(updated);
      this.notifications.success('Datos del cliente actualizados.');
    } catch (error) {
      this.notifications.error(error instanceof Error ? error.message : 'No fue posible actualizar el cliente.');
    } finally {
      this.isMutating.set(false);
    }
  }

  async addAddress(): Promise<void> {
    const ref = this.dialog.open(ClientAddressFormDialogComponent, {
      width: '420px',
      autoFocus: false,
      data: { mode: 'create' },
    });

    const result = (await firstValueFrom(ref.afterClosed())) as ClientAddressFormResult | null;
    if (!result) return;

    this.isMutating.set(true);
    try {
      const updated = await this.clientDirectoryService.addAddress(this.clientId, result);
      this.clientProfile.set(updated);
      this.notifications.success('Dirección agregada.');
    } catch (error) {
      this.notifications.error(error instanceof Error ? error.message : 'No fue posible agregar la dirección.');
    } finally {
      this.isMutating.set(false);
    }
  }

  async editAddress(address: ClientAddressHistoryItem): Promise<void> {
    if (address.id == null) return;

    const ref = this.dialog.open(ClientAddressFormDialogComponent, {
      width: '420px',
      autoFocus: false,
      data: {
        mode: 'edit',
        addressLine: address.addressLine,
        neighborhood: address.neighborhood,
        reference: address.reference,
      },
    });

    const result = (await firstValueFrom(ref.afterClosed())) as ClientAddressFormResult | null;
    if (!result) return;

    this.isMutating.set(true);
    try {
      const updated = await this.clientDirectoryService.updateAddress(this.clientId, address.id, result);
      this.clientProfile.set(updated);
      this.notifications.success('Dirección actualizada.');
    } catch (error) {
      this.notifications.error(error instanceof Error ? error.message : 'No fue posible actualizar la dirección.');
    } finally {
      this.isMutating.set(false);
    }
  }

  async deleteAddress(address: ClientAddressHistoryItem): Promise<void> {
    if (address.id == null) return;

    const confirmed = await this.confirmService.confirmDelete(
      'Eliminar dirección',
      `¿Eliminar "${address.addressLine}"?`,
      'Esta acción no puede deshacerse.',
    );
    if (!confirmed) return;

    this.isMutating.set(true);
    try {
      const updated = await this.clientDirectoryService.deleteAddress(this.clientId, address.id);
      this.clientProfile.set(updated);
      this.notifications.success('Dirección eliminada.');
    } catch (error) {
      this.notifications.error(error instanceof Error ? error.message : 'No fue posible eliminar la dirección.');
    } finally {
      this.isMutating.set(false);
    }
  }

  async createQuotation(): Promise<void> {
    const clientProfile = this.clientProfile();
    if (!clientProfile) return;

    const queryParams: Record<string, string> = { client: clientProfile.id };

    if (clientProfile.addresses.length > 0) {
      const ref = this.dialog.open(AddressPickerDialogComponent, {
        width: '520px',
        autoFocus: false,
        data: {
          clientName: clientProfile.clientName,
          addresses: clientProfile.addresses,
        },
      });

      const result = (await firstValueFrom(ref.afterClosed())) as AddressPickerResult | null;
      if (!result) return;

      if (result.kind === 'new') {
        queryParams['dirNueva'] = '1';
        await this.router.navigate(['/cotizaciones/nueva'], { queryParams });
      } else {
        await this.router.navigate(['/cotizaciones/nueva'], {
          queryParams,
          state: {
            prefillAddressLine: result.addressLine,
            prefillNeighborhood: result.neighborhood,
            prefillReference: result.reference,
            prefillFreight: result.freight,
          },
        });
      }
      return;
    }

    await this.router.navigate(['/cotizaciones/nueva'], { queryParams });
  }

  async openOrder(orderId: string): Promise<void> {
    await this.router.navigate(['/pedidos', orderId]);
  }

  private async loadClientProfile(): Promise<void> {
    try {
      const clientProfile = await this.clientDirectoryService.loadClientProfile(this.clientId);
      this.clientProfile.set(clientProfile);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No fue posible cargar el cliente solicitado.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
