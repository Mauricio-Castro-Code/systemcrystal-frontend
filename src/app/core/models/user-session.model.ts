export type UserRole = 'admin' | 'ventas' | 'chofer';

export interface UserSession {
  id: string;
  displayName: string;
  email: string;
  token: string;
  isAdmin: boolean;
  role?: UserRole;
}
