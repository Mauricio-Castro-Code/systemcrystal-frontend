import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DashboardOrderGroup } from '../../models/dashboard-order-group.model';

@Component({
  selector: 'app-order-agenda-board',
  imports: [CommonModule, CurrencyPipe, RouterLink],
  templateUrl: './order-agenda-board.html',
  styleUrl: './order-agenda-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderAgendaBoardComponent {
  readonly groups = input.required<DashboardOrderGroup[]>();

  readonly pageSize = 5;
  private readonly pages = linkedSignal({
    source: this.groups,
    computation: () => ({}) as Record<string, number>,
  });

  pageIndex(group: DashboardOrderGroup): number {
    return Math.min(this.pages()[group.id] ?? 0, this.pageCount(group) - 1);
  }

  pageCount(group: DashboardOrderGroup): number {
    return Math.max(1, Math.ceil(group.orders.length / this.pageSize));
  }

  visibleOrders(group: DashboardOrderGroup) {
    const start = this.pageIndex(group) * this.pageSize;
    return group.orders.slice(start, start + this.pageSize);
  }

  firstVisible(group: DashboardOrderGroup): number {
    return group.orders.length ? this.pageIndex(group) * this.pageSize + 1 : 0;
  }

  lastVisible(group: DashboardOrderGroup): number {
    return Math.min((this.pageIndex(group) + 1) * this.pageSize, group.orders.length);
  }

  changePage(group: DashboardOrderGroup, direction: number): void {
    const page = Math.max(
      0,
      Math.min(this.pageIndex(group) + direction, this.pageCount(group) - 1),
    );
    this.pages.update((pages) => ({ ...pages, [group.id]: page }));
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
