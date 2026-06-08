import { QuotationNote } from '../../../core/models/quotation-note.model';

export type OrderOperationalStatus =
  | 'PROGRAMADA'
  | 'ENTREGADO'
  | 'POR_RECOGER'
  | 'CLIENTE_ENTREGA'
  | 'RECOGIDO';

export type OrderBillingStatus =
  | 'AL_CORRIENTE'
  | 'POR_COBRAR'
  | 'COBRADO';

export interface OrderWorkflowEventRecord {
  id: number;
  category: 'OPERATIONAL' | 'BILLING';
  categoryLabel: string;
  fromStatus: string;
  fromStatusLabel: string;
  toStatus: string;
  toStatusLabel: string;
  comment: string;
  createdAt: string;
  changedBy: string;
}

export interface OrderRecord {
  orderId: string;
  clientName: string;
  date: string;
  status: 'Confirmado';
  operationalStatus: OrderOperationalStatus;
  operationalStatusLabel: string;
  billingStatus: OrderBillingStatus;
  billingStatusLabel: string;
  folderKeys: string[];
  folderLabels: string[];
  totalEstimated: number;
  isCancelled: boolean;
  quotation: QuotationNote;
  workflowHistory?: OrderWorkflowEventRecord[];
}
