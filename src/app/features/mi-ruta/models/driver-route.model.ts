import { OrderOperationalStatus } from '../../pedidos/models/order-record.model';

export interface DriverRouteItem {
  quantity: number;
  equipment: string;
}

export type StopPriority = 'ALTA' | 'NORMAL' | 'BAJA';

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
  // Restricción que el chofer agregó a esta parada (texto libre interpretado por IA
  // o capturado manualmente); null cuando no tiene ninguna.
  timeWindowStart: string | null;
  timeWindowEnd: string | null;
  priority: StopPriority;
  restrictionNote: string;
  // Resultado de la última optimización (Google Maps); null hasta pulsar "Optimizar ruta".
  sequence: number | null;
  eta: string | null;
  routeAlert: string | null;
}

export interface RouteSummary {
  recommendedDeparture: string | null;
  firstStopEta: string | null;
  totalDurationMinutes: number;
  totalDistanceKm: number;
}

export interface DriverRoute {
  date: string;
  dateLabel: string;
  totalStops: number;
  completed: number;
  pending: number;
  stops: DriverRouteStop[];
  summary: RouteSummary | null;
}
