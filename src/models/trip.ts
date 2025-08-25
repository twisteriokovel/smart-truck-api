export enum TripStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled'
}

export interface ITripDto {
  orderId: string;
  truckId: string;
  cargoSize: number;
  startTime: Date;
  plannedFuel: number;
}

export interface ITripResponse {
  _id: string;
  orderId: string;
  truckId: string;
  cargoSize: number;
  status: TripStatus;
  startTime: Date;
  plannedFuel: number;
  actualEndTime?: Date;
  actualFuel?: number;
  actualTimeSpent?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITripsListResponse {
  trips: ITripResponse[];
  total: number;
}

export interface IUpdateTripDto {
  cargoSize?: number;
  startTime?: Date;
  plannedFuel?: number;
  actualEndTime?: Date;
  actualFuel?: number;
  actualTimeSpent?: number;
  notes?: string;
}

export interface IFinishTripDto {
  actualEndTime: Date;
  actualFuel: number;
  actualTimeSpent: number;
  notes?: string;
}