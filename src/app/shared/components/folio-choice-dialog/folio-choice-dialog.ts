import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type FolioStrategy = 'fill' | 'sequential';

export interface FolioGapOption {
  value: number;
  folio: string;
}

export interface FolioChoiceDialogData {
  gaps: FolioGapOption[];
  sequentialFolio: string;
}

export interface FolioChoiceResult {
  strategy: FolioStrategy;
  value: number | null;
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

  chooseGap(gap: FolioGapOption): void {
    this.dialogRef.close({ strategy: 'fill', value: gap.value } as FolioChoiceResult);
  }

  chooseSequential(): void {
    this.dialogRef.close({ strategy: 'sequential', value: null } as FolioChoiceResult);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
