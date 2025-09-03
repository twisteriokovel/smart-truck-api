export enum OrderStatus {
  DRAFT = 'draft',
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export interface IOrderDto {
  cargoSize: number;
  destinationAddressId: string;
  notes?: string;
}

export interface IOrderResponse {
  _id: string;
  cargoSize: number;
  remainingCargo: number;
  status: OrderStatus;
  destinationAddressId: string;
  notes?: string;
  trips: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrdersListResponse {
  orders: IOrderResponse[];
  total: number;
}

export interface IUpdateOrderDto {
  cargoSize?: number;
  destinationAddressId?: string;
  notes?: string;
}
