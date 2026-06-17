import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';

import { AuthService } from '../../../../core/services/auth.service';
import { TeamService } from '../../../../core/services/team.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import {
  TeamMemberDialogComponent,
  TeamMemberDialogResult,
} from '../../components/team-member-dialog/team-member-dialog';
import { TeamMember } from '../../models/team-member.model';

@Component({
  selector: 'app-equipo-page',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTableModule,
  ],
  templateUrl: './equipo-page.html',
  styleUrl: './equipo-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipoPageComponent {
  private readonly teamService = inject(TeamService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly confirmService = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);

  readonly displayedColumns = ['displayName', 'email', 'role', 'isActive', 'actions'];
  readonly members = this.teamService.members;
  readonly isLoading = this.teamService.isLoading;
  readonly errorMessage = this.teamService.errorMessage;

  private readonly currentUserId = this.authService.userSession()?.id ?? '';

  constructor() {
    void this.teamService.loadMembers();
  }

  isCurrentUser(member: TeamMember): boolean {
    return member.id === this.currentUserId;
  }

  async reload(): Promise<void> {
    await this.teamService.loadMembers();
  }

  async openCreate(): Promise<void> {
    const result = await this.openDialog(null);

    if (!result) {
      return;
    }

    try {
      await this.teamService.createMember({
        displayName: result.displayName,
        email: result.email,
        password: result.password,
        role: result.role,
      });
      this.notifications.success(`Usuario ${result.email} creado.`);
    } catch (error) {
      this.notifications.error(this.resolveError(error));
    }
  }

  async openEdit(member: TeamMember): Promise<void> {
    const result = await this.openDialog(member);

    if (!result) {
      return;
    }

    try {
      await this.teamService.updateMember(member.id, {
        displayName: result.displayName,
        role: result.role,
        ...(result.password ? { password: result.password } : {}),
      });
      this.notifications.success(`Usuario ${member.email} actualizado.`);
    } catch (error) {
      this.notifications.error(this.resolveError(error));
    }
  }

  async toggleActive(member: TeamMember): Promise<void> {
    try {
      await this.teamService.updateMember(member.id, { isActive: !member.isActive });
      this.notifications.success(
        member.isActive
          ? `Acceso de ${member.email} deshabilitado.`
          : `Acceso de ${member.email} habilitado.`,
      );
    } catch (error) {
      this.notifications.error(this.resolveError(error));
    }
  }

  async deleteMember(member: TeamMember): Promise<void> {
    const confirmed = await this.confirmService.confirmDelete(
      `Eliminar a ${member.displayName}`,
      `¿Seguro que deseas eliminar la cuenta de ${member.email}?`,
      'Esta acción no se puede deshacer.',
    );

    if (!confirmed) {
      return;
    }

    try {
      await this.teamService.deleteMember(member.id);
      this.notifications.success(`Usuario ${member.email} eliminado.`);
    } catch (error) {
      this.notifications.error(this.resolveError(error));
    }
  }

  private openDialog(member: TeamMember | null): Promise<TeamMemberDialogResult | null> {
    const ref = this.dialog.open(TeamMemberDialogComponent, {
      width: '440px',
      data: { member },
      autoFocus: false,
    });

    return firstValueFrom(ref.afterClosed()).then(
      (value: TeamMemberDialogResult | null | undefined) => value ?? null,
    );
  }

  private resolveError(error: unknown): string {
    return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
  }
}
