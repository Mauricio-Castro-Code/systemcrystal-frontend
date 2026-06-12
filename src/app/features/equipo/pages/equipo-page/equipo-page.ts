import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';

import { AuthService } from '../../../../core/services/auth.service';
import { TeamService } from '../../../../core/services/team.service';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
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

  readonly displayedColumns = ['displayName', 'email', 'role', 'isActive', 'actions'];
  readonly members = this.teamService.members;
  readonly isLoading = this.teamService.isLoading;
  readonly errorMessage = this.teamService.errorMessage;
  readonly actionMessage = signal('');

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
      this.actionMessage.set(`Usuario ${result.email} creado.`);
    } catch (error) {
      this.actionMessage.set(this.resolveError(error));
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
      this.actionMessage.set(`Usuario ${member.email} actualizado.`);
    } catch (error) {
      this.actionMessage.set(this.resolveError(error));
    }
  }

  async toggleActive(member: TeamMember): Promise<void> {
    try {
      await this.teamService.updateMember(member.id, { isActive: !member.isActive });
      this.actionMessage.set(
        member.isActive
          ? `Acceso de ${member.email} deshabilitado.`
          : `Acceso de ${member.email} habilitado.`,
      );
    } catch (error) {
      this.actionMessage.set(this.resolveError(error));
    }
  }

  async deleteMember(member: TeamMember): Promise<void> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: `Eliminar a ${member.displayName}`,
        message: `¿Seguro que deseas eliminar la cuenta de ${member.email}?`,
        detail: 'Esta acción no se puede deshacer.',
        danger: true,
      },
      autoFocus: false,
    });

    const confirmed = await firstValueFrom(ref.afterClosed()).then(
      (value: unknown) => value === true,
    );

    if (!confirmed) {
      return;
    }

    try {
      await this.teamService.deleteMember(member.id);
      this.actionMessage.set(`Usuario ${member.email} eliminado.`);
    } catch (error) {
      this.actionMessage.set(this.resolveError(error));
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
