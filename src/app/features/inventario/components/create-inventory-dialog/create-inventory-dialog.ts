import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { InventoryService } from '../../../../core/services/inventory.service';
import { AuthService } from '../../../../core/services/auth.service';
import { INVENTORY_CATEGORIES, InventoryCategory, InventoryItem } from '../../models/inventory-item.model';

@Component({
  selector: 'app-create-inventory-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Registrar producto en inventario</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        <p>El producto quedará disponible en el catálogo y se agregará a tu nota.</p>
        <mat-form-field appearance="outline">
          <mat-label>Nombre del producto</mat-label>
          <input matInput formControlName="name" />
          <mat-hint>Incluye el color, por ejemplo: Mantel redondo azul.</mat-hint>
          <mat-error>Captura un nombre de hasta 120 caracteres.</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Categoría</mat-label>
          <mat-select formControlName="category">
            @for (category of categories; track category.value) {
              <mat-option [value]="category.value">{{ category.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Cantidad disponible en inventario</mat-label>
          <input matInput type="number" min="0" step="1" formControlName="quantity" />
          <mat-error>Captura una cantidad entera mayor o igual a cero.</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Precio unitario</mat-label>
          <span matTextPrefix>$&nbsp;</span>
          <input matInput type="number" min="0" step="0.01" formControlName="unitPrice" />
          <mat-error>Captura un precio mayor o igual a cero.</mat-error>
        </mat-form-field>
        @if (errorMessage()) { <p role="alert">{{ errorMessage() }}</p> }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" [disabled]="isSaving()" (click)="dialogRef.close()">Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="isSaving()">
          {{ isSaving() ? 'Guardando…' : 'Guardar y agregar a la nota' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `mat-dialog-content { display: grid; gap: 12px; } p { margin: 0 0 8px; }`,
})
export class CreateInventoryDialogComponent {
  readonly dialogRef = inject(MatDialogRef<CreateInventoryDialogComponent, InventoryItem>);
  private readonly inventoryService = inject(InventoryService);
  private readonly authService = inject(AuthService);
  private readonly data = inject<{ name: string; unitPrice: number }>(MAT_DIALOG_DATA);
  readonly categories = INVENTORY_CATEGORIES;
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.data.name, [Validators.required, Validators.maxLength(120), Validators.pattern(/\S/)]],
    category: ['OTROS' as InventoryCategory, Validators.required],
    quantity: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    unitPrice: [this.data.unitPrice, [Validators.required, Validators.min(0)]],
  });

  async save(): Promise<void> {
    if (this.isSaving() || !this.authService.isAdmin()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.isSaving.set(true);
    this.dialogRef.disableClose = true;
    this.errorMessage.set('');
    try {
      const payload = this.form.getRawValue();
      const item = await this.inventoryService.createItem({ ...payload, name: payload.name.trim() });
      this.dialogRef.close(item);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible registrar el producto.');
    } finally {
      this.isSaving.set(false);
      this.dialogRef.disableClose = false;
    }
  }
}
