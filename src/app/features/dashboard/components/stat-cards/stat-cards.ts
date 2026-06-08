import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { DashboardStat } from '../../models/dashboard-stat.model';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon';

@Component({
  selector: 'app-stat-cards',
  imports: [CommonModule, AppIconComponent],
  templateUrl: './stat-cards.html',
  styleUrl: './stat-cards.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCardsComponent {
  readonly stats = input.required<DashboardStat[]>();

  trackByStatId(_: number, stat: DashboardStat): string {
    return stat.id;
  }
}
