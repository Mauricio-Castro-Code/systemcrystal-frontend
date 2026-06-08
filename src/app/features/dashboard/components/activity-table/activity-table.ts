import { CommonModule, CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { RecentActivity } from '../../models/recent-activity.model';

@Component({
  selector: 'app-activity-table',
  imports: [CommonModule, CurrencyPipe, DatePipe, NgClass],
  templateUrl: './activity-table.html',
  styleUrl: './activity-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityTableComponent {
  readonly activities = input.required<RecentActivity[]>();

  trackByActivityId(_: number, activity: RecentActivity): string {
    return activity.id;
  }

  resolveStatusClass(status: RecentActivity['status']): string {
    switch (status) {
      case 'Pendiente':
        return 'badge--pending';
      case 'En ruta':
        return 'badge--route';
      case 'Entregado':
        return 'badge--delivered';
      case 'Facturado':
        return 'badge--billed';
      default:
        return '';
    }
  }
}
