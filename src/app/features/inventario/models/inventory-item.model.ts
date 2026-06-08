export interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
}

export type InventoryItemPayload = Omit<InventoryItem, 'id'>;
