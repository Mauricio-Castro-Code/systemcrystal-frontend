export interface DashboardAgendaOrder {
  id: string;
  clientName: string;
  address: string;
  total: number;
}

export interface DashboardOrderGroup {
  id: 'today' | 'tomorrow' | 'weekend' | 'delivery-range';
  title: string;
  subtitle: string;
  emptyMessage: string;
  orders: DashboardAgendaOrder[];
}
