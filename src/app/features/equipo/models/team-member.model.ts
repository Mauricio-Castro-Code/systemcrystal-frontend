import { UserRole } from '../../../core/models/user-session.model';

export interface TeamMember {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string | null;
}

export interface CreateTeamMemberInput {
  displayName: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateTeamMemberInput {
  displayName?: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
}

export const TEAM_ROLE_OPTIONS: ReadonlyArray<{ value: UserRole; label: string }> = [
  { value: 'admin', label: 'Administrador' },
  { value: 'ventas', label: 'Ventas' },
  { value: 'chofer', label: 'Chofer' },
];
