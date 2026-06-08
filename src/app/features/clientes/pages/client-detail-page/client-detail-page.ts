import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ClientDirectoryService } from '../../../../core/services/client-directory.service';
import { ClientProfile } from '../../models/client-profile.model';

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

    await this.router.navigate(['/cotizaciones/nueva'], {
      queryParams: {
        client: clientProfile.id,
      },
    });
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
