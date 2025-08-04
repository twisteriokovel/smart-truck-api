import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Address, AddressDocument } from '../schemas/address.schema';
import {
  IAddressDto,
  IAddressResponse,
  IAddressesListResponse,
} from '../models/address';

type AddressLean = Address & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AddressService {
  constructor(
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
  ) {}

  async create(createAddressDto: IAddressDto): Promise<IAddressResponse> {
    const address = new this.addressModel(createAddressDto);
    const savedAddress = await address.save();
    return this.formatAddressResponse(savedAddress as AddressDocument);
  }

  async findAllAddresses(): Promise<IAddressesListResponse> {
    const addresses = await this.addressModel
      .find()
      .sort({ createdAt: -1 })
      .lean<AddressLean[]>()
      .exec();

    const total = await this.addressModel.countDocuments();

    return {
      addresses: addresses.map((address) =>
        this.formatAddressResponse(address),
      ),
      total,
    };
  }

  async findOneAddress(id: string): Promise<IAddressResponse> {
    const address = await this.addressModel
      .findById(id)
      .lean<AddressLean>()
      .exec();

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return this.formatAddressResponse(address);
  }

  async update(
    id: string,
    updateAddressDto: IAddressDto,
  ): Promise<IAddressResponse> {
    const updatedAddress = await this.addressModel
      .findByIdAndUpdate(id, updateAddressDto, { new: true })
      .lean<AddressLean>()
      .exec();

    if (!updatedAddress) {
      throw new NotFoundException('Address not found');
    }

    return this.formatAddressResponse(updatedAddress);
  }

  async remove(id: string): Promise<{ message: string }> {
    const deletedAddress = await this.addressModel.findByIdAndDelete(id).exec();

    if (!deletedAddress) {
      throw new NotFoundException('Address not found');
    }

    return { message: 'Address deleted successfully' };
  }

  private formatAddressResponse(
    address: AddressDocument | AddressLean,
  ): IAddressResponse {
    return {
      _id: (address as AddressLean)._id.toString(),
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      country: address.country,
      postcode: address.postcode,
      state: address.state,
      createdAt: (address as AddressLean).createdAt,
      updatedAt: (address as AddressLean).updatedAt,
    };
  }
}
