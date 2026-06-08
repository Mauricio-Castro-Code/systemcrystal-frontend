export interface QuotationClientInfo {
  fullName: string;
  phoneNumber: string;
  birthDate: string | null;
  address: string;
  neighborhood: string;
  reference: string;
  deliveryInstructions: string;
}

export interface QuotationSchedule {
  deliveryDate: string | null;
  eventDate: string | null;
  collectionDate: string | null;
}

export interface QuotationEquipmentItem {
  quantity: number;
  equipment: string;
  unitPrice: number;
  total: number;
}

export interface QuotationLogistics {
  freight: number;
  securityDeposit: number;
  applyTax: boolean;
}

export interface QuotationSummary {
  subtotal: number;
  freight: number;
  taxAmount: number;
  securityDeposit: number;
  discount: number;
  advancePayment: number;
  totalEstimated: number;
  balanceDue: number;
}

export interface QuotationNote {
  clientInfo: QuotationClientInfo;
  schedule: QuotationSchedule;
  logistics: QuotationLogistics;
  equipmentItems: QuotationEquipmentItem[];
  summary: QuotationSummary;
}
