export type NoteSortKey =
  | 'id-desc'
  | 'id-asc'
  | 'delivery-asc'
  | 'delivery-desc';

export interface NoteSortOption {
  key: NoteSortKey;
  label: string;
}

export const NOTE_SORT_OPTIONS: NoteSortOption[] = [
  { key: 'id-desc', label: 'ID mas reciente' },
  { key: 'id-asc', label: 'ID mas antiguo' },
  { key: 'delivery-asc', label: 'Entrega mas proxima' },
  { key: 'delivery-desc', label: 'Entrega mas lejana' },
];
