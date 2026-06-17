import { OrderOperationalStatus } from '../../pedidos/models/order-record.model';

export interface DriverRouteItem {
  quantity: number;
  equipment: string;
}

export interface DriverRouteStop {
  orderId: string;
  clientName: string;
  address: string;
  reference: string;
  phoneNumber: string;
  deliveryInstructions: string;
  deliveryDate: string | null;
  eventDate: string | null;
  mapsUrl: string;
  operationalStatus: OrderOperationalStatus;
  operationalStatusLabel: string;
  itemsCount: number;
  items: DriverRouteItem[];
}

export interface DriverRoute {
  date: string;
  dateLabel: string;
  totalStops: number;
  completed: number;
  pending: number;
  stops: DriverRouteStop[];
}
