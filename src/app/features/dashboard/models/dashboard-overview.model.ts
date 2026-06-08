import { DashboardOrderGroup } from './dashboard-order-group.model';
import { DashboardStat } from './dashboard-stat.model';

export interface DashboardDeliveryRange {
  startDate: string;
  endDate: string;
  group: DashboardOrderGroup;
}

export interface DashboardOverview {
  generatedAt: string;
  stats: DashboardStat[];
  orderGroups: DashboardOrderGroup[];
  deliveryRange: DashboardDeliveryRange;
}
