import { TripStatus } from '../../models/trip';

export interface ITruckScheduleConflict {
  tripId: string;
  startDate: Date;
  endDate: Date;
  status: TripStatus;
}

export interface ITruckScheduleInfo {
  isAvailable: boolean;
  conflicts: ITruckScheduleConflict[];
  suggestions?: Array<{
    availableStart: Date;
    availableEnd: Date;
  }>;
}

export interface IAvailableTruck {
  _id: string;
  model: string;
  plateNumber: string;
  maxPallets: number;
  availableCapacity: number;
  maxWeight: number;
  width: number;
  height: number;
  length: number;
  fuelCapacity?: number;
  isActive: boolean;
  scheduleInfo: ITruckScheduleInfo;
}

export interface IAvailableTrucksResponse {
  trucks: IAvailableTruck[];
  totalAvailable: number;
  requestedDateTime?: Date;
  requestedDuration?: number;
}
