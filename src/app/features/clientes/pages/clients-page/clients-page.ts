import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
  effect,
  inject,
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

import { firstValueFrom } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

import { Client } from '../../models/client.model';
import { ClientDirectoryService } from '../../../../core/services/client-directory.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import {
  ClientFormDialogComponent,
  ClientFormResult,
} from '../../../../shared/components/client-form-dialog/client-form-dialog';

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
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);

  readonly isAdmin = this.authService.isAdmin;

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly displayedColumns = ['clientName', 'phoneNumber', 'address', 'mergedRecords', 'actions'];
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

      this.notifications.success(`Celular copiado: ${normalizedPhoneNumber}`);
    } catch {
      this.notifications.error('No fue posible copiar el número seleccionado.');
    }
  }

  async reloadClients(): Promise<void> {
    await this.clientDirectoryService.loadClients();
  }

  async createClient(): Promise<void> {
    const ref = this.dialog.open(ClientFormDialogComponent, {
      width: '420px',
      autoFocus: false,
      data: { mode: 'create' },
    });

    const result = (await firstValueFrom(ref.afterClosed())) as ClientFormResult | null;
    if (!result) return;

    try {
      await this.clientDirectoryService.createClient(result);
      this.notifications.success('Cliente creado correctamente.');
      await this.reloadClients();
    } catch (error) {
      this.notifications.error(error instanceof Error ? error.message : 'No fue posible crear el cliente.');
    }
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
