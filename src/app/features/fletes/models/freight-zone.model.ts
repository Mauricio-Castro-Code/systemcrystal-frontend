export interface FreightZone {
  id: number;
  name: string;
  price: number;
  notes: string;
}

export interface FreightZonePayload {
  name: string;
  price: number;
  notes: string;
}
