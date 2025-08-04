export interface IAddressDto {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  country: string;
  postcode: string;
  state: string;
}

export interface IAddressResponse {
  _id: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  country: string;
  postcode: string;
  state: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAddressesListResponse {
  addresses: IAddressResponse[];
  total: number;
}
