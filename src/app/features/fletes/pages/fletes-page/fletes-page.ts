import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { FreightZonesService } from '../../../../core/services/freight-zones.service';
import { FreightZone } from '../../models/freight-zone.model';

@Component({
  selector: 'app-fletes-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './fletes-page.html',
  styleUrl: './fletes-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FletesPgeComponent implements OnInit {
  private readonly zonesService = inject(FreightZonesService);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  readonly isAdmin = this.authService.isAdmin;

  readonly zones = signal<FreightZone[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly searchQuery = signal('');

  readonly formVisible = signal(false);
  readonly editingZone = signal<FreightZone | null>(null);
  readonly formName = signal('');
  readonly formPrice = signal(0);
  readonly formNotes = signal('');
  readonly formError = signal<string | null>(null);
  readonly saving = signal(false);


  readonly filteredZones = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const zones = this.zones();
    if (!q) return zones;
    return zones.filter((z) => z.name.toLowerCase().includes(q));
  });

  async ngOnInit(): Promise<void> {
    await this.loadZones();
  }

  async goBack(): Promise<void> {
    await this.router.navigateByUrl('/dashboard');
  }

  async loadZones(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const zones = await this.zonesService.fetchAll();
      this.zones.set(zones);
    } catch {
      this.error.set('No fue posible cargar las zonas de flete.');
    } finally {
      this.loading.set(false);
    }
  }

  openCreateForm(): void {
    this.editingZone.set(null);
    this.formName.set('');
    this.formPrice.set(0);
    this.formNotes.set('');
    this.formError.set(null);
    this.formVisible.set(true);
  }

  openEditForm(zone: FreightZone): void {
    this.editingZone.set(zone);
    this.formName.set(zone.name);
    this.formPrice.set(zone.price);
    this.formNotes.set(zone.notes);
    this.formError.set(null);
    this.formVisible.set(true);
  }

  closeForm(): void {
    this.formVisible.set(false);
    this.editingZone.set(null);
  }

  async saveZone(): Promise<void> {
    const name = this.formName().trim();
    const price = this.formPrice();
    const notes = this.formNotes().trim();

    if (!name) {
      this.formError.set('El nombre de la colonia es obligatorio.');
      return;
    }

    this.saving.set(true);
    this.formError.set(null);

    try {
      const editing = this.editingZone();
      if (editing) {
        const updated = await this.zonesService.update(editing.id, { name, price, notes });
        this.zones.update((zones) =>
          zones.map((z) => (z.id === editing.id ? updated : z)),
        );
      } else {
        const created = await this.zonesService.create({ name, price, notes });
        this.zones.update((zones) => [...zones, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      this.closeForm();
    } catch (err: any) {
      const msg = err?.error?.name?.[0] ?? err?.error?.detail ?? 'No fue posible guardar la zona.';
      this.formError.set(msg);
    } finally {
      this.saving.set(false);
    }
  }

  async deleteZone(zone: FreightZone): Promise<void> {
    if (!confirm(`Eliminar la zona "${zone.name}"?`)) return;
    try {
      await this.zonesService.delete(zone.id);
      this.zones.update((zones) => zones.filter((z) => z.id !== zone.id));
    } catch {
      this.error.set('No fue posible eliminar la zona.');
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
}
