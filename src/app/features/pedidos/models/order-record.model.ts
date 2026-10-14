import { QuotationNote } from '../../../core/models/quotation-note.model';

export const EXPENSE_CATEGORIES = [
  { value: 'SUBARRENDOS', label: 'Subarrendos' },
  { value: 'MESEROS', label: 'Meseros' },
  { value: 'CARPAS', label: 'Carpas' },
  { value: 'OTROS', label: 'Otros' },
] as const;
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]['value'];

export interface ExtraCost {
  categoria?: ExpenseCategory | 'UNCLASSIFIED';
  id: number;
  concepto: string;
  monto: number;
}

export type OrderOperationalStatus =
  | 'PROGRAMADA'
  | 'EN_CAMINO'
  | 'ENTREGADO'
  | 'POR_RECOGER'
  | 'CLIENTE_ENTREGA'
  | 'RECOGIDO';

export interface AssignedDriver {
  id: number;
  name: string;
}

export type OrderBillingStatus = 'AL_CORRIENTE' | 'POR_COBRAR' | 'COBRADO';

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
  printedAt: string | null;
  isCancelled: boolean;
  mapsUrl: string;
  officeClosed: boolean;
  extraCosts: ExtraCost[];
  totalExtraCosts: number;
  retainedDeposit?: number;
  accountingRevenue?: number;
  assignedDriver: AssignedDriver | null;
  quotation: QuotationNote;
  workflowHistory?: OrderWorkflowEventRecord[];
}
