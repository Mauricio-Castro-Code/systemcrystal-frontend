export interface RecentActivity {
  id: string;
  client: string;
  date: Date;
  amount: number;
  status: 'Pendiente' | 'En ruta' | 'Entregado' | 'Facturado';
}
