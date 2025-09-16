export interface ITruckDimensions {
  width: number;
  height: number;
  length: number;
}

export interface ITruckResponse {
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
  manufacturingYear?: number;
  notes?: string;
  isActive: boolean;
  maxPallets: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateTruckDto {
  plateNumber: string;
  vinCode: string;
  registrationCertificate: string;
  driverName: string;
  width: number;
  height: number;
  length: number;
  maxWeight: number;
  truckModel?: string;
  manufacturingYear?: number;
  notes?: string;
  isActive?: boolean;
}

export interface IUpdateTruckDto {
  plateNumber?: string;
  vinCode?: string;
  registrationCertificate?: string;
  driverName?: string;
  width?: number;
  height?: number;
  length?: number;
  maxWeight?: number;
  truckModel?: string;
  manufacturingYear?: number;
  notes?: string;
  isActive?: boolean;
}

export interface IPalletInfo {
  width: number;
  length: number;
}

export const EURO_PALLET: IPalletInfo = {
  width: 1.2,
  length: 0.8,
};

export const DOOR_CLEARANCE = 0.06;

export interface ITrucksListResponse {
  trucks: ITruckResponse[];
  total: number;
  page: number;
  pageSize: number;
}
