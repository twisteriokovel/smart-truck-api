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
  width: 1200,
  length: 800,
};

export interface ITrucksListResponse {
  trucks: ITruckResponse[];
  total: number;
}
