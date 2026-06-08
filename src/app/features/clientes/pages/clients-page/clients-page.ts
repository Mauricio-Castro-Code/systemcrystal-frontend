import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { startWith } from 'rxjs';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Client } from '../../models/client.model';
import { ClientDirectoryService } from '../../../../core/services/client-directory.service';

@Component({
  selector: 'app-clients',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './clients-page.html',
  styleUrl: './clients-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientsPageComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly clientDirectoryService = inject(ClientDirectoryService);
  private readonly router = inject(Router);

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly displayedColumns = ['clientName', 'phoneNumber', 'address', 'mergedRecords', 'actions'];
  readonly copyFeedback = signal('');
  readonly isLoading = this.clientDirectoryService.isLoading;
  readonly errorMessage = this.clientDirectoryService.errorMessage;
  readonly totalClients = this.clientDirectoryService.totalClients;
  readonly dataSource = new MatTableDataSource<Client>([]);

  constructor() {
    this.dataSource.filterPredicate = (client, filter) => {
      const normalizedFilter = filter.trim().toLowerCase();
      const searchableValues = [client.clientName, client.phoneNumber, client.address];

      return searchableValues.some((value) =>
        value.toLowerCase().includes(normalizedFilter),
      );
    };

    this.searchControl.valueChanges
      .pipe(startWith(''), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.dataSource.filter = value.trim().toLowerCase();
        this.paginator?.firstPage();
      });

    effect(() => {
      this.dataSource.data = this.clientDirectoryService.clients();
    });

    void this.reloadClients();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }

    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  async copyPhoneNumber(phoneNumber: string): Promise<void> {
    const normalizedPhoneNumber = phoneNumber.trim();

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(normalizedPhoneNumber);
      } else {
        this.copyWithTemporaryTextarea(normalizedPhoneNumber);
      }

      this.copyFeedback.set(`Celular copiado: ${normalizedPhoneNumber}`);
    } catch {
      this.copyFeedback.set('No fue posible copiar el numero seleccionado.');
    }
  }

  async reloadClients(): Promise<void> {
    await this.clientDirectoryService.loadClients();
  }

  async viewClientDetails(client: Client): Promise<void> {
    await this.router.navigate(['/clientes', client.id]);
  }

  private copyWithTemporaryTextarea(value: string): void {
    if (typeof document === 'undefined') {
      throw new Error('Clipboard API unavailable');
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
