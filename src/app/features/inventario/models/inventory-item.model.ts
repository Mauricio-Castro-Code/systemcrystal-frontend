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
}

export type InventoryItemPayload = Omit<InventoryItem, 'id'>;
