import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { UserRole } from '../../../../core/models/user-session.model';
import {
  TEAM_ROLE_OPTIONS,
  TeamMember,
} from '../../models/team-member.model';

export interface TeamMemberDialogData {
  member: TeamMember | null;
}

export interface TeamMemberDialogResult {
  displayName: string;
  email: string;
  role: UserRole;
  password: string;
}

@Component({
  selector: 'app-team-member-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './team-member-dialog.html',
  styleUrl: './team-member-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamMemberDialogComponent {
  readonly dialogRef = inject(MatDialogRef<TeamMemberDialogComponent>);
  readonly data: TeamMemberDialogData = inject(MAT_DIALOG_DATA);
  readonly roleOptions = TEAM_ROLE_OPTIONS;

  readonly isEditing = this.data.member !== null;

  readonly form = new FormGroup({
    displayName: new FormControl(this.data.member?.displayName ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    email: new FormControl(this.data.member?.email ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    role: new FormControl<UserRole>(this.data.member?.role ?? 'ventas', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: this.isEditing ? [] : [Validators.required, Validators.minLength(8)],
    }),
  });

  constructor() {
    if (this.isEditing) {
      this.form.controls.email.disable();
      // En edicion, si se escribe contrasena debe tener 8+ caracteres.
      this.form.controls.password.addValidators(Validators.minLength(8));
    }
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const result: TeamMemberDialogResult = {
      displayName: raw.displayName.trim(),
      email: raw.email.trim().toLowerCase(),
      role: raw.role,
      password: raw.password,
    };

    this.dialogRef.close(result);
  }
}
