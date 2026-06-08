export type UserRole = 'admin' | 'ventas';

export interface RegisterCredentials {
  email: string;
  password: string;
  registrationKey: string;
  role: UserRole;
}
