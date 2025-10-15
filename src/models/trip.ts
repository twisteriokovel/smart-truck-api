export enum TripStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export interface IOrderTrip {
  _id: string;
  orderId: string;
  truckId: string;
  startDate: Date;
  status: TripStatus;
  palletIds: string[];
  estimatedFuel: number;
  estimatedDuration: number;
  actualFuel?: number;
  actualDuration?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateOrderTripData {
  orderId: string;
  truckId: string;
  startDate: Date;
  palletIds: string[];
  estimatedFuel: number;
  estimatedDuration: number;
  notes?: string;
}

export interface IUpdateOrderTripData {
  truckId?: string;
  startDate?: Date;
  palletIds?: string[];
  estimatedFuel?: number;
  estimatedDuration?: number;
  notes?: string;
}

export interface ICompleteOrderTripData {
  actualFuel?: number;
  actualDuration?: number;
}

export interface ITripDto {
  orderId: string;
  truckId: string;
  palletIds?: string[];
  startDate: Date;
  estimatedFuel: number;
  estimatedDuration: number;
  notes?: string;
}

export interface ITripTruckInfo {
  _id: string;
  plateNumber: string;
  vinCode: string;
  registrationCertificate: string;
  driverName: string;
  width: number;
  height: number;
  length: number;
  maxWeight: number;
  truckModel?: string;
  model?: string;
  fuelCapacity?: number;
  manufacturingYear?: number;
  notes?: string;
  isActive: boolean;
  maxPallets: number;
}

export interface ITripResponse {
  _id: string;
  tripNumber: string;
  orderId: string;
  truckId: string;
  truck: ITripTruckInfo;
  status: TripStatus;
  startDate: Date;
  palletIds: string[];
  estimatedFuel: number;
  estimatedDuration: number;
  actualFuel?: number;
  actualDuration?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITripsListResponse {
  trips: ITripResponse[];
  total: number;
}

export interface IUpdateTripDto {
  truckId?: string;
  startDate?: Date;
  palletIds?: string[];
  estimatedFuel?: number;
  estimatedDuration?: number;
  notes?: string;
}

export interface IFinishTripDto {
  actualFuel?: number;
  actualDuration?: number;
}

export interface IUpdateTripStatusDto {
  status: TripStatus;
}
