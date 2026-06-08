import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { AuthService } from '../../../../core/services/auth.service';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { StatCardsComponent } from '../../components/stat-cards/stat-cards';
import { OrderAgendaBoardComponent } from '../../components/order-agenda-board/order-agenda-board';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    StatCardsComponent,
    OrderAgendaBoardComponent,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-MX' }],
})
export class DashboardPageComponent {
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);

  readonly userSession = this.authService.userSession;
  readonly generatedAt = this.dashboardService.generatedAt;
  readonly isLoading = this.dashboardService.isLoading;
  readonly errorMessage = this.dashboardService.errorMessage;
  readonly stats = this.dashboardService.stats;
  readonly orderGroups = this.dashboardService.orderGroups;
  readonly deliveryRange = this.dashboardService.deliveryRange;
  readonly deliveryDateFromControl = new FormControl<Date | null>(this.buildRelativeDate(0));
  readonly deliveryDateToControl = new FormControl<Date | null>(this.buildRelativeDate(5));
  readonly deliveryRangeErrorMessage = signal('');
  readonly deliveryRangeGroup = computed(() => {
    const deliveryRange = this.deliveryRange();

    return deliveryRange ? [deliveryRange.group] : [];
  });

  readonly summaryTitle = computed(() => {
    if (this.errorMessage()) {
      return 'Sincronizacion pendiente';
    }

    if (this.isLoading()) {
      return 'Actualizando datos';
    }

    return 'Datos en vivo';
  });

  readonly summaryMessage = computed(() => {
    const generatedAt = this.generatedAt();

    if (this.errorMessage()) {
      return this.errorMessage();
    }

    if (this.isLoading() && !generatedAt) {
      return 'Consultando el backend para construir el resumen operativo real.';
    }

    if (!generatedAt) {
      return 'Todavia no hay un resumen operativo disponible.';
    }

    return 'Resumen consolidado generado desde el backend actual del sistema.';
  });

  constructor() {
    void this.reloadDashboard();
  }

  async reloadDashboard(): Promise<void> {
    const filters = this.resolveDeliveryRangeFilters();

    if (!filters) {
      return;
    }

    await this.dashboardService.loadOverview(filters);
  }

  async applyDeliveryRange(): Promise<void> {
    await this.reloadDashboard();
  }

  private resolveDeliveryRangeFilters():
    | { deliveryDateFrom: string; deliveryDateTo: string }
    | null {
    const startDate = this.deliveryDateFromControl.value;
    const endDate = this.deliveryDateToControl.value;

    if (!startDate || !endDate) {
      this.deliveryRangeErrorMessage.set(
        'Selecciona la fecha inicial y la fecha final del rango de entrega.',
      );
      return null;
    }

    const normalizedStartDate = this.normalizeDate(startDate);
    const normalizedEndDate = this.normalizeDate(endDate);

    if (normalizedStartDate.getTime() > normalizedEndDate.getTime()) {
      this.deliveryRangeErrorMessage.set(
        'La fecha inicial no puede ser posterior a la fecha final.',
      );
      return null;
    }

    this.deliveryRangeErrorMessage.set('');

    return {
      deliveryDateFrom: this.toIsoDate(normalizedStartDate),
      deliveryDateTo: this.toIsoDate(normalizedEndDate),
    };
  }

  private buildRelativeDate(daysFromToday: number): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + daysFromToday);
    return date;
  }

  private normalizeDate(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
