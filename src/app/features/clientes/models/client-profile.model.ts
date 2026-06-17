import { QuotationClientInfo } from '../../../core/models/quotation-note.model';
import { Client } from './client.model';

export interface ClientAddressHistoryItem {
  address: string;
  addressLine: string;
  neighborhood: string;
  reference: string;
  lastUsedAt: string;
  usageCount: number;
}

export interface ClientOrderHistoryItem {
  orderId: string;
  status: string;
  confirmedAt: string;
  deliveryDate: string | null;
  eventDate: string | null;
  collectionDate: string | null;
  totalEstimated: number;
  address: string;
  reference: string;
}

export interface ClientProfile extends Client {
  mergedClientCodes: string[];
  addresses: ClientAddressHistoryItem[];
  orderHistory: ClientOrderHistoryItem[];
  prefill: {
    clientInfo: QuotationClientInfo;
  };
}
