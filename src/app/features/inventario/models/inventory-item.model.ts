export type InventoryCategory = 'VAJILLA' | 'MOBILIARIO' | 'MANTELERIA' | 'CARPAS' | 'OTROS';

export const INVENTORY_CATEGORIES: { value: InventoryCategory; label: string }[] = [
  { value: 'VAJILLA', label: 'Vajilla' },
  { value: 'MOBILIARIO', label: 'Mobiliario' },
  { value: 'MANTELERIA', label: 'Mantelería' },
  { value: 'CARPAS', label: 'Carpas' },
  { value: 'OTROS', label: 'Otros' },
];

export interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  category: InventoryCategory;
  highSeasonPrice?: number | null;
  replacementCost?: number;
}

export type InventoryItemPayload = Omit<InventoryItem, 'id'>;

export interface InventoryImportRow {
  rowNumber: number;
  action: 'create' | 'update';
  name: string;
  category: string;
  quantity: number | null;
  unitPrice: number | null;
  highSeasonPrice: number | null;
  replacementCost: number | null;
  errors: string[];
}

export interface InventoryImportPreview {
  rows: InventoryImportRow[];
  errors: string[];
  createCount: number;
  updateCount: number;
  canImport: boolean;
  token: string | null;
}

export interface InventoryImportResult {
  created: number;
  updated: number;
}
