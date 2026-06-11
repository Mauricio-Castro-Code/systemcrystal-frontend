import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type FolioStrategy = 'fill' | 'sequential';

export interface FolioChoiceDialogData {
  fillFolio: string;
  sequentialFolio: string;
}

@Component({
  selector: 'app-folio-choice-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './folio-choice-dialog.html',
  styleUrl: './folio-choice-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FolioChoiceDialogComponent {
  readonly dialogRef = inject(MatDialogRef<FolioChoiceDialogComponent>);
  readonly data: FolioChoiceDialogData = inject(MAT_DIALOG_DATA);

  choose(strategy: FolioStrategy): void {
    this.dialogRef.close(strategy);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
