import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { startWith } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTable, MatTableModule } from '@angular/material/table';

import {
  QuotationEquipmentItem,
  QuotationNote,
} from '../../../../core/models/quotation-note.model';
import { InventoryItem } from '../../../inventario/models/inventory-item.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { OrderRecordsService } from '../../../../core/services/order-records.service';
import { QuotationRecordsService } from '../../../../core/services/quotation-records.service';
import { FolioStrategyService } from '../../../../core/services/folio-strategy.service';
import { ClientDirectoryService } from '../../../../core/services/client-directory.service';
import { FreightZonesService } from '../../../../core/services/freight-zones.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { FreightZone } from '../../../fletes/models/freight-zone.model';

type EquipmentRowForm = FormGroup<{
  quantity: FormControl<number>;
  equipment: FormControl<string>;
  unitPrice: FormControl<number>;
  total: FormControl<number>;
}>;

const phoneTenDigitsValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const rawValue = String(control.value ?? '');
  const digitsOnly = rawValue.replace(/\D/g, '');

  return digitsOnly.length === 10 ? null : { invalidPhone: true };
};

const scheduleValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const deliveryDate = control.get('deliveryDate')?.value as Date | null;
  const eventDate = control.get('eventDate')?.value as Date | null;
  const collectionDate = control.get('collectionDate')?.value as Date | null;

  if (!deliveryDate || !eventDate || !collectionDate) {
    return null;
  }

  const deliveryTime = deliveryDate.getTime();
  const eventTime = eventDate.getTime();
  const collectionTime = collectionDate.getTime();

  if (deliveryTime > eventTime || eventTime > collectionTime) {
    return { invalidSchedule: true };
  }

  return null;
};

@Component({
  selector: 'app-new-quotation',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatTableModule,
  ],
  templateUrl: './new-quotation-page.html',
  styleUrl: './new-quotation-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewQuotationPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly inventoryService = inject(InventoryService);
  private readonly orderRecordsService = inject(OrderRecordsService);
  private readonly quotationRecordsService = inject(QuotationRecordsService);
  private readonly folioStrategyService = inject(FolioStrategyService);
  private readonly clientDirectoryService = inject(ClientDirectoryService);
  private readonly freightZonesService = inject(FreightZonesService);
  private readonly notifications = inject(NotificationService);
  private readonly confirmService = inject(ConfirmService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Pila de productos eliminados para poder deshacer (último eliminado, primero en restaurarse).
  private readonly deletedRows = signal<Array<{ index: number; value: QuotationEquipmentItem }>>([]);
  readonly canUndoDelete = computed(() => this.deletedRows().length > 0);

  @ViewChild(MatTable) equipmentTable?: MatTable<EquipmentRowForm>;

  readonly editingOrderId = this.route.snapshot.paramMap.get('orderId');
  readonly editingQuotationId = this.route.snapshot.paramMap.get('quotationId');
  readonly selectedClientId = this.route.snapshot.queryParamMap.get('client');
  // Dirección elegida en el modal de cliente: índice de la guardada o "nueva" (en blanco).
  readonly selectedAddressIndex = this.route.snapshot.queryParamMap.get('addrIndex');
  readonly useNewAddress = this.route.snapshot.queryParamMap.get('dirNueva') === '1';
  // Duplicar: prellena la NUEVA cotización con la info de una nota existente.
  readonly duplicateFromOrderId = this.route.snapshot.queryParamMap.get('duplicarDe');
  readonly isEditingOrder = this.editingOrderId !== null;
  readonly isEditingQuotation = this.editingQuotationId !== null;
  readonly isEditMode = this.isEditingOrder || this.isEditingQuotation;
  readonly breadcrumbs = this.isEditingOrder
    ? `Crystal Alquiler / Pedidos / ${this.editingOrderId} / Editar`
    : this.isEditingQuotation
      ? `Crystal Alquiler / Cotizaciones / ${this.editingQuotationId} / Editar`
      : 'Crystal Alquiler / Cotizaciones / Nueva';
  readonly pageTitle = this.isEditingOrder
    ? `Editar Pedido ${this.editingOrderId}`
    : this.isEditingQuotation
      ? `Editar Cotizacion ${this.editingQuotationId}`
      : 'Nueva Cotizacion';
  readonly pageDescription = this.isEditingOrder
    ? 'Ajusta domicilio, fechas, equipo y montos del pedido confirmado.'
    : this.isEditingQuotation
      ? 'Ajusta la cotizacion preliminar antes de confirmarla como pedido.'
      : 'Captura la informacion del cliente, programa las fechas y arma el equipo requerido para generar una cotizacion formal.';
  readonly displayedColumns = ['quantity', 'equipment', 'unitPrice', 'total', 'actions'];
  readonly actionMessage = signal('');
  readonly inventoryItems = this.inventoryService.items;
  readonly inventoryLoading = this.inventoryService.isLoading;
  readonly inventoryErrorMessage = this.inventoryService.errorMessage;
  readonly inventorySummaryMessage = computed(() => {
    const totalItems = this.inventoryItems().length;

    if (this.inventoryErrorMessage()) {
      return this.inventoryErrorMessage();
    }

    if (this.inventoryLoading() && totalItems === 0) {
      return 'Cargando catalogo real de productos...';
    }

    if (totalItems === 0) {
      return 'No hay productos registrados todavia. Puedes capturar libre o ir a Inventario.';
    }

    return `${totalItems} producto${totalItems === 1 ? '' : 's'} disponibles para autocompletar y traer precio base.`;
  });
  readonly summary = signal({
    subtotal: 0,
    freight: 0,
    taxAmount: 0,
    securityDeposit: 0,
    discount: 0,
    advancePayment: 0,
    totalEstimated: 0,
    balanceDue: 0,
  });
  readonly isSaving = signal(false);
  readonly freightZones = signal<FreightZone[]>([]);
  readonly freightSuggestion = signal<FreightZone | null>(null);

  readonly colorPrompt = signal<{ row: EquipmentRowForm; baseValue: string } | null>(null);
  readonly colorInput = signal('');

  private readonly COLOR_TRIGGERS = [
    'mantel',
    'cubremantel',
    'camino',
    'servilleta de tela',
  ];

  readonly quotationForm = this.formBuilder.group({
    clientInfo: this.formBuilder.group({
      fullName: ['', [Validators.required, Validators.maxLength(120)]],
      phoneNumber: ['', [Validators.required, phoneTenDigitsValidator]],
      birthDate: [null as Date | null],
      address: ['', [Validators.maxLength(180)]],
      neighborhood: ['', [Validators.maxLength(120)]],
      reference: ['', [Validators.maxLength(220)]],
      deliveryInstructions: ['', [Validators.maxLength(220)]],
    }),
    schedule: this.formBuilder.group(
      {
        deliveryDate: [null as Date | null, Validators.required],
        eventDate: [null as Date | null, Validators.required],
        collectionDate: [null as Date | null, Validators.required],
      },
      {
        validators: [scheduleValidator],
      },
    ),
    logistics: this.formBuilder.group({
      freight: [0, [Validators.required, Validators.min(0)]],
      applyTax: [false],
      securityDeposit: [0, [Validators.required, Validators.min(0)]],
      discount: [0, [Validators.required, Validators.min(0)]],
      advancePayment: [0, [Validators.required, Validators.min(0)]],
    }),
    equipmentRows: this.formBuilder.array<EquipmentRowForm>([]),
  });

  constructor() {
    void this.inventoryService.loadInventory();
    void this.loadFreightZones();
    this.addEquipmentRow();

    if (this.isEditMode) {
      void this.loadRecordForEditing();
    } else if (this.duplicateFromOrderId) {
      void this.loadRecordForDuplication();
    } else if (this.selectedClientId) {
      void this.loadSelectedClientPrefill();
    }

    this.quotationForm.valueChanges
      .pipe(startWith(this.quotationForm.getRawValue()), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.recalculateSummary();
        this.updateFreightSuggestion();
      });
  }

  get clientInfoForm() {
    return this.quotationForm.controls.clientInfo;
  }

  get scheduleForm() {
    return this.quotationForm.controls.schedule;
  }

  get logisticsForm() {
    return this.quotationForm.controls.logistics;
  }

  get equipmentRows(): FormArray<EquipmentRowForm> {
    return this.quotationForm.controls.equipmentRows;
  }

  addEquipmentRow(): void {
    const equipmentRow = this.createEquipmentRow();
    this.equipmentRows.push(equipmentRow);
    this.equipmentTable?.renderRows();
    this.recalculateSummary();
  }

  async removeEquipmentRow(index: number): Promise<void> {
    if (this.equipmentRows.length === 1) {
      this.notifications.warning('La nota debe tener al menos un producto.');
      return;
    }

    const row = this.equipmentRows.at(index);
    const value = row.getRawValue() as QuotationEquipmentItem;
    const productLabel = (value.equipment || '').trim() || 'este producto';

    const confirmed = await this.confirmService.confirmDelete(
      'Eliminar producto',
      `¿Quitar "${productLabel}" de la nota?`,
      'Podrás deshacerlo con el botón Deshacer.',
    );

    if (!confirmed) {
      return;
    }

    this.equipmentRows.removeAt(index);
    this.equipmentTable?.renderRows();
    this.recalculateSummary();
    this.quotationForm.markAsDirty();

    // Guardamos el producto eliminado (y su posición) para poder restaurarlo.
    this.deletedRows.update((stack) => [...stack, { index, value }]);

    const toast = this.notifications.info('Producto eliminado.', { actionLabel: 'Deshacer' });
    toast.onAction().subscribe(() => this.undoLastDelete());
  }

  undoLastDelete(): void {
    const stack = this.deletedRows();
    if (stack.length === 0) {
      return;
    }

    const last = stack[stack.length - 1];
    this.deletedRows.update((current) => current.slice(0, -1));

    const restoredRow = this.createEquipmentRow(last.value);
    const targetIndex = Math.min(last.index, this.equipmentRows.length);
    this.equipmentRows.insert(targetIndex, restoredRow);

    this.equipmentTable?.renderRows();
    this.recalculateSummary();
    this.quotationForm.markAsDirty();
    this.notifications.success('Producto restaurado.');
  }

  async saveDraft(): Promise<void> {
    if (!this.validateBeforePersist()) {
      return;
    }

    const quotationSnapshot = this.buildQuotationSnapshot();
    this.isSaving.set(true);

    try {
      if (this.isEditingQuotation && this.editingQuotationId) {
        const updatedQuotation = await this.quotationRecordsService.updateDraft(
          this.editingQuotationId,
          quotationSnapshot,
        );

        if (!updatedQuotation) {
          this.notifications.error('No fue posible actualizar la cotización solicitada.');
          return;
        }

        this.notifications.success(
          `Cotización ${updatedQuotation.quotationId} actualizada y cliente sincronizado.`,
        );
        return;
      }

      const createdQuotation = await this.quotationRecordsService.createDraft({
        quotation: quotationSnapshot,
      });

      this.notifications.success(
        `Cotización ${createdQuotation.quotationId} guardada y cliente sincronizado.`,
      );
    } catch (error) {
      this.notifications.error(
        this.resolveActionError(error, 'No fue posible guardar la cotización.'),
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  savePdf(): void {
    this.persistSimpleAction('PDF generado');
  }

  printQuote(): void {
    this.persistSimpleAction('Impresion preparada');
  }

  async saveNote(): Promise<void> {
    if (!this.validateBeforePersist()) {
      return;
    }

    const folioSelection = await this.folioStrategyService.resolve();

    if (folioSelection === null) {
      return;
    }

    this.isSaving.set(true);

    try {
      const createdOrder = await this.orderRecordsService.createConfirmedOrder({
        quotation: this.buildQuotationSnapshot(),
        folioSelection,
      });

      this.notifications.success(
        `Nota guardada. Pedido ${createdOrder.orderId} confirmado y cliente sincronizado.`,
      );
      await this.router.navigate(['/pedidos', createdOrder.orderId]);
    } catch (error) {
      this.notifications.error(
        this.resolveActionError(error, 'No fue posible guardar la nota del pedido.'),
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  async saveOrderChanges(): Promise<void> {
    if (!this.validateBeforePersist()) {
      return;
    }

    if (!this.editingOrderId) {
      return;
    }

    this.isSaving.set(true);

    try {
      const updatedOrder = await this.orderRecordsService.updateOrder(
        this.editingOrderId,
        this.buildQuotationSnapshot(),
      );

      if (!updatedOrder) {
        this.notifications.error('No fue posible actualizar el pedido solicitado.');
        return;
      }

      this.notifications.success(
        `Pedido ${updatedOrder.orderId} actualizado y cliente sincronizado.`,
      );
    } catch (error) {
      this.notifications.error(
        this.resolveActionError(error, 'No fue posible actualizar el pedido solicitado.'),
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  async goToOrderPreview(): Promise<void> {
    if (!this.editingOrderId) {
      return;
    }

    await this.router.navigate(['/pedidos', this.editingOrderId]);
  }

  async goToOrderRecords(): Promise<void> {
    await this.router.navigateByUrl('/pedidos');
  }

  async goToQuotationPreview(): Promise<void> {
    if (!this.editingQuotationId) {
      return;
    }

    await this.router.navigate(['/cotizaciones', this.editingQuotationId]);
  }

  async goToQuotationRecords(): Promise<void> {
    await this.router.navigateByUrl('/cotizaciones/registro');
  }

  async confirmQuotationAsOrder(): Promise<void> {
    if (!this.editingQuotationId) {
      return;
    }

    if (!this.validateBeforePersist()) {
      return;
    }

    const folioSelection = await this.folioStrategyService.resolve();

    if (folioSelection === null) {
      return;
    }

    this.isSaving.set(true);

    try {
      const updatedQuotation = await this.quotationRecordsService.updateDraft(
        this.editingQuotationId,
        this.buildQuotationSnapshot(),
      );

      if (!updatedQuotation) {
        this.notifications.error('No fue posible actualizar la cotización antes de confirmarla.');
        return;
      }

      const createdOrder = await this.quotationRecordsService.confirmDraftAsOrder(
        updatedQuotation.quotationId,
        folioSelection,
      );

      if (!createdOrder) {
        this.notifications.error('No fue posible confirmar la cotización seleccionada.');
        return;
      }

      this.notifications.success(`Cotización confirmada como pedido ${createdOrder.orderId}.`);
      await this.router.navigate(['/pedidos', createdOrder.orderId]);
    } catch (error) {
      this.notifications.error(
        this.resolveActionError(error, 'No fue posible confirmar la cotización seleccionada.'),
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  trackByEquipmentRow(_: number, control: EquipmentRowForm): EquipmentRowForm {
    return control;
  }

  hasControlError(
    control: AbstractControl | null,
    errorCode: string,
  ): boolean {
    return !!control?.touched && !!control.errors?.[errorCode];
  }

  applyInventorySelection(
    row: EquipmentRowForm,
    event: MatAutocompleteSelectedEvent,
  ): void {
    const selectedProductName = String(event.option.value ?? '').trim();
    const inventoryItem = this.inventoryService.findByName(selectedProductName);

    if (!inventoryItem) {
      return;
    }

    row.controls.equipment.setValue(inventoryItem.name);
    row.controls.unitPrice.setValue(inventoryItem.unitPrice);

    if (this.requiresColorInput(inventoryItem.name)) {
      this.colorInput.set('');
      this.colorPrompt.set({ row, baseValue: inventoryItem.name });
    }
  }

  getInventoryMatches(searchTerm: string): InventoryItem[] {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const inventoryItems = this.inventoryItems();

    if (!normalizedSearchTerm) {
      return inventoryItems.slice(0, 8);
    }

    return inventoryItems
      .filter((item) => item.name.toLowerCase().includes(normalizedSearchTerm))
      .slice(0, 8);
  }

  onEquipmentBlur(row: EquipmentRowForm): void {
    const value = (row.controls.equipment.value ?? '').trim();
    if (!value || !this.requiresColorInput(value)) return;
    if (this.alreadyHasColor(value)) return;
    this.colorInput.set('');
    this.colorPrompt.set({ row, baseValue: value });
  }

  confirmColor(): void {
    const prompt = this.colorPrompt();
    if (!prompt) return;
    const color = this.colorInput().trim();
    if (color) {
      prompt.row.controls.equipment.setValue(`${prompt.baseValue} - ${color}`);
    }
    this.colorPrompt.set(null);
    this.colorInput.set('');
  }

  dismissColor(): void {
    this.colorPrompt.set(null);
    this.colorInput.set('');
  }

  applyFreightSuggestion(): void {
    const zone = this.freightSuggestion();
    if (!zone) return;
    this.logisticsForm.controls.freight.setValue(zone.price);
  }

  private requiresColorInput(equipment: string): boolean {
    const normalized = equipment.toLowerCase().trim();
    return this.COLOR_TRIGGERS.some((trigger) => normalized.includes(trigger));
  }

  private alreadyHasColor(equipment: string): boolean {
    return equipment.includes(' - ');
  }

  private async loadFreightZones(): Promise<void> {
    try {
      const zones = await this.freightZonesService.fetchAll();
      this.freightZones.set(zones);
    } catch {
      // silencioso — no bloquea el formulario
    }
  }

  private updateFreightSuggestion(): void {
    const neighborhood = (this.clientInfoForm.controls.neighborhood.value ?? '').toLowerCase().trim();
    if (!neighborhood || neighborhood.length < 3) {
      this.freightSuggestion.set(null);
      return;
    }
    const zones = this.freightZones();
    const match = zones.find(
      (z) =>
        z.name.toLowerCase().includes(neighborhood) ||
        neighborhood.includes(z.name.toLowerCase()),
    );
    this.freightSuggestion.set(match ?? null);
  }

  private createEquipmentRow(initialValue?: Partial<QuotationEquipmentItem>): EquipmentRowForm {
    const quantity = Math.max(1, Number(initialValue?.quantity ?? 1));
    const unitPrice = Math.max(0, Number(initialValue?.unitPrice ?? 0));

    const row: EquipmentRowForm = new FormGroup({
      quantity: this.formBuilder.nonNullable.control(quantity, {
        validators: [Validators.required, Validators.min(1)],
      }),
      equipment: this.formBuilder.nonNullable.control(initialValue?.equipment ?? '', {
        validators: [Validators.required, Validators.maxLength(120)],
      }),
      unitPrice: this.formBuilder.nonNullable.control(unitPrice, {
        validators: [Validators.required, Validators.min(0)],
      }),
      total: new FormControl<number>(
        { value: quantity * unitPrice, disabled: true },
        { nonNullable: true },
      ),
    });

    row.controls.quantity.valueChanges
      .pipe(startWith(row.controls.quantity.value), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateRowTotal(row);
      });

    row.controls.unitPrice.valueChanges
      .pipe(startWith(row.controls.unitPrice.value), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateRowTotal(row);
      });

    return row;
  }

  private updateRowTotal(row: EquipmentRowForm): void {
    const quantity = Number(row.controls.quantity.value ?? 0);
    const unitPrice = Number(row.controls.unitPrice.value ?? 0);
    const total = quantity * unitPrice;

    row.controls.total.setValue(total, { emitEvent: false });
    this.recalculateSummary();
  }

  private recalculateSummary(): void {
    const subtotal = this.roundCurrency(
      this.equipmentRows.controls.reduce((runningTotal, row) => {
        return runningTotal + Number(row.controls.total.getRawValue() ?? 0);
      }, 0),
    );
    const freight = this.roundCurrency(Number(this.logisticsForm.controls.freight.value ?? 0));
    const applyTax = !!this.logisticsForm.controls.applyTax.value;
    const taxAmount = applyTax
      ? this.roundCurrency((subtotal + freight) * 0.16)
      : 0;
    const securityDeposit = this.roundCurrency(
      Number(this.logisticsForm.controls.securityDeposit.value ?? 0),
    );
    const discount = this.roundCurrency(
      Number(this.logisticsForm.controls.discount.value ?? 0),
    );
    const advancePayment = this.roundCurrency(
      Number(this.logisticsForm.controls.advancePayment.value ?? 0),
    );
    const totalEstimated = this.roundCurrency(
      subtotal + freight + taxAmount + securityDeposit,
    );
    const balanceDue = this.roundCurrency(
      Math.max(totalEstimated - discount - advancePayment, 0),
    );

    this.summary.set({
      subtotal,
      freight,
      taxAmount,
      securityDeposit,
      discount,
      advancePayment,
      totalEstimated,
      balanceDue,
    });
  }

  private buildQuotationSnapshot(): QuotationNote {
    const clientInfo = this.clientInfoForm.getRawValue();
    const schedule = this.scheduleForm.getRawValue();
    const logistics = this.logisticsForm.getRawValue();
    const equipmentItems = this.equipmentRows.controls.map((row) => {
      const quantity = Number(row.controls.quantity.value ?? 0);
      const unitPrice = Number(row.controls.unitPrice.value ?? 0);

      return {
        quantity,
        equipment: row.controls.equipment.value.trim(),
        unitPrice,
        total: quantity * unitPrice,
      };
    });
    const subtotal = this.roundCurrency(
      equipmentItems.reduce((runningTotal, item) => {
        return runningTotal + item.total;
      }, 0),
    );
    const freight = this.roundCurrency(Number(logistics.freight ?? 0));
    const applyTax = !!logistics.applyTax;
    const taxAmount = applyTax
      ? this.roundCurrency((subtotal + freight) * 0.16)
      : 0;
    const securityDeposit = this.roundCurrency(Number(logistics.securityDeposit ?? 0));
    const discount = this.roundCurrency(Number(logistics.discount ?? 0));
    const advancePayment = this.roundCurrency(Number(logistics.advancePayment ?? 0));
    const totalEstimated = this.roundCurrency(
      subtotal + freight + taxAmount + securityDeposit,
    );
    const balanceDue = this.roundCurrency(totalEstimated - discount - advancePayment);

    return {
      clientInfo: {
        fullName: String(clientInfo.fullName ?? '').trim(),
        phoneNumber: String(clientInfo.phoneNumber ?? '').trim(),
        birthDate: this.serializeDate(clientInfo.birthDate),
        address: String(clientInfo.address ?? '').trim(),
        neighborhood: String(clientInfo.neighborhood ?? '').trim(),
        reference: String(clientInfo.reference ?? '').trim(),
        deliveryInstructions: String(clientInfo.deliveryInstructions ?? '').trim(),
      },
      schedule: {
        deliveryDate: this.serializeDate(schedule.deliveryDate),
        eventDate: this.serializeDate(schedule.eventDate),
        collectionDate: this.serializeDate(schedule.collectionDate),
      },
      logistics: {
        freight,
        securityDeposit,
        applyTax,
      },
      equipmentItems,
      summary: {
        subtotal,
        freight,
        taxAmount,
        securityDeposit,
        discount,
        advancePayment,
        totalEstimated,
        balanceDue,
      },
    };
  }

  // Vuelca una cotización/nota en los formularios (reutilizado por editar y duplicar).
  private applyQuotationToForms(quotation: QuotationNote): void {
    this.clientInfoForm.patchValue({
      fullName: quotation.clientInfo.fullName,
      phoneNumber: quotation.clientInfo.phoneNumber,
      birthDate: this.parseDate(quotation.clientInfo.birthDate),
      address: quotation.clientInfo.address,
      neighborhood: quotation.clientInfo.neighborhood,
      reference: quotation.clientInfo.reference,
      deliveryInstructions: quotation.clientInfo.deliveryInstructions,
    });

    this.scheduleForm.patchValue({
      deliveryDate: this.parseDate(quotation.schedule.deliveryDate),
      eventDate: this.parseDate(quotation.schedule.eventDate),
      collectionDate: this.parseDate(quotation.schedule.collectionDate),
    });

    this.logisticsForm.patchValue({
      freight: quotation.logistics.freight,
      applyTax: quotation.logistics.applyTax,
      securityDeposit: quotation.logistics.securityDeposit,
      discount: quotation.summary.discount,
      advancePayment: quotation.summary.advancePayment,
    });

    this.equipmentRows.clear();

    if (quotation.equipmentItems.length === 0) {
      this.equipmentRows.push(this.createEquipmentRow());
    } else {
      quotation.equipmentItems.forEach((item) => {
        this.equipmentRows.push(this.createEquipmentRow(item));
      });
    }

    this.equipmentTable?.renderRows();
    this.recalculateSummary();
  }

  private async loadRecordForDuplication(): Promise<void> {
    if (!this.duplicateFromOrderId) {
      return;
    }

    try {
      const order = await this.orderRecordsService.loadOrderById(this.duplicateFromOrderId);

      if (!order?.quotation) {
        this.actionMessage.set('No se encontró la nota a duplicar.');
        return;
      }

      this.applyQuotationToForms(order.quotation);
      // Dejamos el formulario "sucio": es una cotización nueva por guardar.
      this.quotationForm.markAsDirty();
      this.actionMessage.set(
        `Se copió la información de la nota ${order.orderId}. Ajusta lo que necesites y guarda la nueva cotización.`,
      );
    } catch (error) {
      this.actionMessage.set(
        this.resolveActionError(error, 'No se pudo cargar la nota a duplicar.'),
      );
    }
  }

  private async loadRecordForEditing(): Promise<void> {
    try {
      const quotation =
        this.isEditingOrder && this.editingOrderId
          ? (await this.orderRecordsService.loadOrderById(this.editingOrderId))?.quotation
          : this.isEditingQuotation && this.editingQuotationId
            ? (await this.quotationRecordsService.loadQuotationById(this.editingQuotationId))
                ?.quotation
            : null;

      if (!quotation) {
        this.actionMessage.set(
          this.isEditingOrder
            ? 'No se encontro el pedido solicitado para editar.'
            : 'No se encontro la cotizacion solicitada para editar.',
        );
        void this.router.navigateByUrl(
          this.isEditingOrder ? '/pedidos' : '/cotizaciones/registro',
        );
        return;
      }

      this.applyQuotationToForms(quotation);
      this.quotationForm.markAsPristine();
    } catch (error) {
      this.actionMessage.set(
        this.resolveActionError(
          error,
          this.isEditingOrder
            ? 'No se pudo cargar el pedido solicitado.'
            : 'No se pudo cargar la cotizacion solicitada.',
        ),
      );
      void this.router.navigateByUrl(
        this.isEditingOrder ? '/pedidos' : '/cotizaciones/registro',
      );
    }
  }

  private async loadSelectedClientPrefill(): Promise<void> {
    if (!this.selectedClientId) {
      return;
    }

    try {
      const clientProfile = await this.clientDirectoryService.loadClientProfile(
        this.selectedClientId,
      );
      const clientInfo = clientProfile.prefill.clientInfo;

      // Resolvemos qué dirección usar según lo elegido en el modal de cliente.
      let address = clientInfo.address;
      let neighborhood = clientInfo.neighborhood;
      let reference = clientInfo.reference;

      if (this.useNewAddress) {
        // Dirección nueva: dejamos los campos en blanco para capturarla.
        address = '';
        neighborhood = '';
        reference = '';
      } else if (this.selectedAddressIndex !== null) {
        const chosen = clientProfile.addresses[Number(this.selectedAddressIndex)];
        if (chosen) {
          // addressLine/neighborhood vienen separados desde el backend.
          address = chosen.addressLine || chosen.address;
          neighborhood = chosen.neighborhood;
          reference = chosen.reference;
        }
      }

      this.clientInfoForm.patchValue({
        fullName: clientInfo.fullName,
        phoneNumber: clientInfo.phoneNumber,
        birthDate: this.parseDate(clientInfo.birthDate),
        address,
        neighborhood,
        reference,
        deliveryInstructions: clientInfo.deliveryInstructions,
      });

      this.actionMessage.set(
        `Se cargaron los datos de ${clientProfile.clientName} para iniciar la nueva cotizacion.`,
      );
    } catch (error) {
      this.actionMessage.set(
        this.resolveActionError(error, 'No fue posible cargar el cliente seleccionado.'),
      );
    }
  }

  private serializeDate(date: Date | null): string | null {
    if (!date) {
      return null;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private parseDate(value: string | null): Date | null {
    if (!value) {
      return null;
    }

    const [year, month, day] = value.split('-').map(Number);

    if (!year || !month || !day) {
      return null;
    }

    return new Date(year, month - 1, day);
  }

  private persistSimpleAction(actionLabel: string): void {
    if (!this.validateBeforePersist()) {
      return;
    }

    this.actionMessage.set(`${actionLabel} disponible para integracion con backend o PDF.`);
  }

  private validateBeforePersist(): boolean {
    this.quotationForm.markAllAsTouched();

    if (this.quotationForm.invalid) {
      this.actionMessage.set(
        'Revisa los campos requeridos, el celular de 10 digitos y la logica de fechas antes de continuar.',
      );
      return false;
    }

    if (this.summary().discount + this.summary().advancePayment > this.summary().totalEstimated) {
      this.actionMessage.set(
        'El descuento y el anticipo no pueden exceder el total a pagar.',
      );
      return false;
    }

    return true;
  }

  private roundCurrency(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  private resolveActionError(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
  }
}
