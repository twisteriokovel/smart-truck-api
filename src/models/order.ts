export enum OrderStatus {
  DRAFT = 'draft',
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export interface IPallet {
  id: string;
  weight: number;
  height: number;
}

export interface IOrderDto {
  pallets: IPallet[];
  destinationAddressId: string;
  notes?: string;
}

import { IAddressResponse } from './address';

export interface IOrderResponse {
  _id: string;
  pallets: IPallet[];
  cargoWeight: number;
  remainingCargo: number;
  status: OrderStatus;
  destinationAddress: IAddressResponse;
  notes?: string;
  trips: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrdersListResponse {
  orders: IOrderResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IUpdateOrderDto {
  pallets?: IPallet[];
  destinationAddressId?: string;
  notes?: string;
}
