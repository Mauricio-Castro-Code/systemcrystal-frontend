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
  requiresColor?: boolean;
  isActive?: boolean;
  colors?: InventoryColor[];
  canonicalProductId?: number | null;
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

export interface InventoryImportColorRow {
  rowNumber: number;
  productId: number;
  name: string;
  quantity: number | null;
  action: 'create' | 'update';
  errors: string[];
}

export interface InventoryImportPreview {
  colors?: InventoryImportColorRow[];
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

export interface InventoryColor { id: number; name: string; quantity: number; }
export const COLOR_PRODUCT_FAMILIES = ['Mantel para tablón', 'Mantel redondo', 'Cubremantel', 'Servilletas', 'Mantel para sombrilla', 'Bandas'] as const;
export interface InventoryGroupingPayload {
  targetName: string;
  unitPrice: number;
  highSeasonPrice: number | null;
  replacementCost: number;
  sourceMappings: { sourceId: number; color: string }[];
}
export interface InventoryGroupingPreview {
  targetName: string;
  sourceCount: number;
  colorCount: number;
  historyLinks: number;
  colors: { name: string; quantity: number }[];
  warnings: string[];
  errors: string[];
  canConfirm: boolean;
  token: string | null;
}
