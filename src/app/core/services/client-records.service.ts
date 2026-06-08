import { Injectable, signal } from '@angular/core';

import { QuotationNote } from '../models/quotation-note.model';
import { Client } from '../../features/clientes/models/client.model';

const CLIENT_RECORDS_STORAGE_KEY = 'orderflow.clients';

const DEFAULT_CLIENTS: Client[] = [
  {
    id: 'CLI-001',
    clientName: 'Grupo Marea Eventos',
    contactPerson: 'Fernanda Solis',
    phoneNumber: '+52 55 1345 8890',
    email: 'fernanda@mareaeventos.mx',
    address: 'Av. Insurgentes Sur 845, Ciudad de Mexico',
    mergedRecords: 1,
  },
  {
    id: 'CLI-002',
    clientName: 'Constructora Del Valle',
    contactPerson: 'Ramon Cardenas',
    phoneNumber: '+52 81 2784 4300',
    email: 'ramon@cdelvalle.com',
    address: 'Blvd. Diaz Ordaz 1640, Monterrey',
    mergedRecords: 1,
  },
  {
    id: 'CLI-003',
    clientName: 'Hotel Costa Azul',
    contactPerson: 'Elena Prieto',
    phoneNumber: '+52 624 105 4471',
    email: 'elena@costaazulhotel.com',
    address: 'Paseo del Mar 120, Los Cabos',
    mergedRecords: 1,
  },
  {
    id: 'CLI-004',
    clientName: 'Producciones Nova',
    contactPerson: 'Javier Ruiz',
    phoneNumber: '+52 33 2190 7744',
    email: 'javier@produccionesnova.mx',
    address: 'Av. Vallarta 2890, Guadalajara',
    mergedRecords: 1,
  },
  {
    id: 'CLI-005',
    clientName: 'Expo Modular MX',
    contactPerson: 'Lucia Herrera',
    phoneNumber: '+52 55 2266 1180',
    email: 'lucia@expomodular.mx',
    address: 'Calle 5 de Febrero 340, Queretaro',
    mergedRecords: 1,
  },
  {
    id: 'CLI-006',
    clientName: 'Stellar Corporate',
    contactPerson: 'Mauricio Vega',
    phoneNumber: '+52 55 4477 2299',
    email: 'mauricio@stellarcorp.io',
    address: 'Av. Santa Fe 495, Ciudad de Mexico',
    mergedRecords: 1,
  },
];

@Injectable({
  providedIn: 'root',
})
export class ClientRecordsService {
  private readonly records = signal<Client[]>(this.loadRecords());

  readonly clients = this.records.asReadonly();

  upsertClientFromQuotation(quotation: QuotationNote): Client {
    const normalizedClient = this.buildClientRecord(quotation);
    const currentRecords = this.records();
    const existingRecord = this.findExistingClient(currentRecords, normalizedClient);

    if (!existingRecord) {
      const newClient = {
        ...normalizedClient,
        id: this.generateClientId(currentRecords),
      };
      const updatedRecords = [newClient, ...currentRecords];

      this.records.set(updatedRecords);
      this.persistRecords(updatedRecords);

      return newClient;
    }

    const updatedClient: Client = {
      ...existingRecord,
      clientName: normalizedClient.clientName,
      contactPerson: normalizedClient.contactPerson,
      phoneNumber: normalizedClient.phoneNumber || existingRecord.phoneNumber,
      email: existingRecord.email || normalizedClient.email,
      address: normalizedClient.address || existingRecord.address,
    };

    const updatedRecords = currentRecords.map((client) =>
      client.id === existingRecord.id ? updatedClient : client,
    );

    this.records.set(updatedRecords);
    this.persistRecords(updatedRecords);

    return updatedClient;
  }

  private loadRecords(): Client[] {
    if (typeof localStorage === 'undefined') {
      return DEFAULT_CLIENTS;
    }

    const persistedRecords = localStorage.getItem(CLIENT_RECORDS_STORAGE_KEY);

    if (!persistedRecords) {
      this.persistRecords(DEFAULT_CLIENTS);
      return DEFAULT_CLIENTS;
    }

    try {
      const parsedRecords = JSON.parse(persistedRecords) as Client[];

      if (!Array.isArray(parsedRecords)) {
        this.persistRecords(DEFAULT_CLIENTS);
        return DEFAULT_CLIENTS;
      }

      const normalizedRecords = parsedRecords
        .filter((client): client is Client => !!client?.id)
        .map((client) => this.normalizeClient(client));

      this.persistRecords(normalizedRecords);

      return normalizedRecords;
    } catch {
      localStorage.removeItem(CLIENT_RECORDS_STORAGE_KEY);
      this.persistRecords(DEFAULT_CLIENTS);
      return DEFAULT_CLIENTS;
    }
  }

  private persistRecords(records: Client[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(CLIENT_RECORDS_STORAGE_KEY, JSON.stringify(records));
  }

  private normalizeClient(client: Client): Client {
    return {
      id: client.id,
      clientName: String(client.clientName ?? '').trim() || 'Cliente sin nombre',
      contactPerson: String(client.contactPerson ?? '').trim() || 'Pendiente',
      phoneNumber: String(client.phoneNumber ?? '').trim(),
      email: String(client.email ?? '').trim(),
      address: String(client.address ?? '').trim(),
      mergedRecords: Number(client.mergedRecords ?? 1),
    };
  }

  private buildClientRecord(quotation: QuotationNote): Client {
    const fullName = String(quotation.clientInfo.fullName ?? '').trim() || 'Cliente sin nombre';
    const phoneNumber = this.formatPhoneNumber(quotation.clientInfo.phoneNumber ?? '');
    const addressParts = [
      String(quotation.clientInfo.address ?? '').trim(),
      String(quotation.clientInfo.neighborhood ?? '').trim(),
    ].filter(Boolean);

    return {
      id: '',
      clientName: fullName,
      contactPerson: fullName,
      phoneNumber,
      email: '',
      address: addressParts.join(', '),
      mergedRecords: 1,
    };
  }

  private findExistingClient(records: Client[], candidate: Client): Client | undefined {
    const normalizedCandidatePhone = this.toDigits(candidate.phoneNumber);
    const normalizedCandidateName = this.toComparableText(candidate.clientName);

    return records.find((client) => {
      const samePhone =
        normalizedCandidatePhone.length > 0 &&
        this.toDigits(client.phoneNumber) === normalizedCandidatePhone;

      if (samePhone) {
        return true;
      }

      return this.toComparableText(client.clientName) === normalizedCandidateName;
    });
  }

  private generateClientId(records: Client[]): string {
    const nextSequence =
      records.reduce((highestSequence, client) => {
        const numericPart = Number(client.id.replace(/[^\d]/g, ''));
        return Number.isFinite(numericPart) && numericPart > highestSequence
          ? numericPart
          : highestSequence;
      }, 0) + 1;

    return `CLI-${String(nextSequence).padStart(3, '0')}`;
  }

  private formatPhoneNumber(rawValue: string): string {
    const digits = this.toDigits(rawValue);

    if (digits.length === 10) {
      return `+52 ${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
    }

    return rawValue.trim();
  }

  private toDigits(rawValue: string): string {
    return String(rawValue ?? '').replace(/\D/g, '');
  }

  private toComparableText(rawValue: string): string {
    return String(rawValue ?? '').trim().toLowerCase();
  }
}
