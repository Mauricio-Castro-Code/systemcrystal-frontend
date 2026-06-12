export type NoteFolderKey =
  | 'all'
  | 'programada'
  | 'entregado'
  | 'por-recoger'
  | 'cliente-entrega'
  | 'recogido'
  | 'por-cobrar'
  | 'pagado';

export interface NoteFolderOption {
  key: NoteFolderKey;
  label: string;
}

export const NOTE_FOLDER_OPTIONS: NoteFolderOption[] = [
  { key: 'all', label: 'Todas' },
  { key: 'programada', label: 'Programadas' },
  { key: 'por-recoger', label: 'En Ruta' },
  { key: 'cliente-entrega', label: 'Cliente entrega' },
  { key: 'por-cobrar', label: 'Por cobrar' },
];

export const NOTE_ARCHIVE_FOLDER_OPTIONS: NoteFolderOption[] = [
  { key: 'all', label: 'Todas' },
  { key: 'por-cobrar', label: 'Por cobrar' },
  { key: 'pagado', label: 'Pagado' },
];
