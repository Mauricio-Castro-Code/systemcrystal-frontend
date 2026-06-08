import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import {
  DashboardAgendaOrder,
  DashboardOrderGroup,
} from '../../models/dashboard-order-group.model';

@Component({
  selector: 'app-order-agenda-board',
  imports: [CommonModule, CurrencyPipe],
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
      return 'Prioridad Inmediata';
    }

    if (group.id === 'tomorrow') {
      return 'Siguiente Jornada';
    }

    if (group.id === 'delivery-range') {
      return 'Entregas Filtradas';
    }

    return 'Planeacion Anticipada';
  }
}
