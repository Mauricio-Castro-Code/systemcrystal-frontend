import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../../../core/services/auth.service';
import { LoginCredentials } from '../../models/login-credentials.model';
import { RegisterCredentials } from '../../models/register-credentials.model';

import { UserRole } from '../../models/register-credentials.model';

type AuthMode = 'login' | 'register';
type LoginFieldName = 'identifier' | 'password';
type RegisterFieldName = 'email' | 'password' | 'registrationKey';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, MatIconModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly authMode = signal<AuthMode>('login');
  readonly isSubmitting = signal(false);
  readonly authError = signal('');
  readonly showLoginPassword = signal(false);
  readonly showRegisterPassword = signal(false);

  readonly loginForm = this.formBuilder.group({
    identifier: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly registerForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    registrationKey: ['', [Validators.required, Validators.minLength(6)]],
    role: ['ventas' as UserRole],
  });

  setAuthMode(mode: AuthMode): void {
    this.authMode.set(mode);
    this.authError.set('');
  }

  toggleLoginPassword(): void {
    this.showLoginPassword.update((visible) => !visible);
  }

  toggleRegisterPassword(): void {
    this.showRegisterPassword.update((visible) => !visible);
  }

  async submitLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.authError.set('');

    try {
      const credentials: LoginCredentials = this.loginForm.getRawValue();
      await this.authService.signIn(credentials);
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.authError.set(this.resolveErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async submitRegistration(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.authError.set('');

    try {
      const credentials: RegisterCredentials = this.registerForm.getRawValue();
      await this.authService.register(credentials);
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.authError.set(this.resolveErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  hasLoginFieldError(fieldName: LoginFieldName): boolean {
    const control = this.loginForm.controls[fieldName];
    return control.invalid && control.touched;
  }

  setRole(role: UserRole): void {
    this.registerForm.controls.role.setValue(role);
  }

  get selectedRole(): UserRole {
    return this.registerForm.controls.role.value as UserRole;
  }

  hasRegisterFieldError(fieldName: RegisterFieldName): boolean {
    const control = this.registerForm.controls[fieldName];
    return control.invalid && control.touched;
  }

  private resolveErrorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'No fue posible completar la solicitud de acceso.';
  }
}
