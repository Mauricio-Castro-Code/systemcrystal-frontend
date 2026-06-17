import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { ClientDirectoryService } from '../../../../core/services/client-directory.service';
import { ClientProfile } from '../../models/client-profile.model';
import {
  AddressPickerDialogComponent,
  AddressPickerResult,
} from '../../../../shared/components/address-picker-dialog/address-picker-dialog';

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
  private readonly dialog = inject(MatDialog);

  readonly clientId = this.route.snapshot.paramMap.get('clientId') ?? '';
  readonly clientProfile = signal<ClientProfile | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly addressCount = computed(() => this.clientProfile()?.addresses.length ?? 0);
  readonly orderCount = computed(() => this.clientProfile()?.orderHistory.length ?? 0);

  constructor() {
    void this.loadClientProfile();
  }

  async goBack(): Promise<void> {
    await this.router.navigateByUrl('/clientes');
  }

  async createQuotation(): Promise<void> {
    const clientProfile = this.clientProfile();

    if (!clientProfile) {
      return;
    }

    const queryParams: Record<string, string> = { client: clientProfile.id };

    // Si el cliente tiene direcciones guardadas, preguntamos cuál usar (o una nueva).
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

      if (!result) {
        return; // canceló
      }

      if (result.kind === 'existing') {
        queryParams['addrIndex'] = String(result.index);
      } else {
        queryParams['dirNueva'] = '1';
      }
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
