import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  DashboardAgendaOrder,
  DashboardOrderGroup,
} from '../../models/dashboard-order-group.model';

@Component({
  selector: 'app-order-agenda-board',
  imports: [CommonModule, CurrencyPipe, RouterLink],
  templateUrl: './order-agenda-board.html',
  styleUrl: './order-agenda-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderAgendaBoardComponent {
  readonly groups = input.required<DashboardOrderGroup[]>();

  trackByGroupId(_: number, group: DashboardOrderGroup): string {
    return group.id;
  }

  trackByOrderId(_: number, order: DashboardAgendaOrder): string {
    return order.id;
  }

  resolveEyebrow(group: DashboardOrderGroup): string {
    if (group.id === 'today') {
      return 'Tu día de hoy';
    }

    if (group.id === 'tomorrow') {
      return 'Lo que sigue';
    }

    if (group.id === 'delivery-range') {
      return 'Resultado de tu consulta';
    }

    return 'Prepárate con tiempo';
  }
}
