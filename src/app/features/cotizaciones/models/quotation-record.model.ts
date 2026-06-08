import { QuotationNote } from '../../../core/models/quotation-note.model';

export interface QuotationRecord {
  quotationId: string;
  clientName: string;
  date: string;
  totalEstimated: number;
  quotation: QuotationNote;
}
