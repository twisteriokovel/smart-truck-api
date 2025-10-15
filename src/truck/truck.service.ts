import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Truck, TruckDocument } from '../schemas/truck.schema';
import {
  ITruckResponse,
  ICreateTruckDto,
  ITrucksListResponse,
  EURO_PALLET,
  DOOR_CLEARANCE,
} from '../models/truck';

type TruckLean = Truck & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  maxPallets: number;
};

@Injectable()
export class TruckService {
  constructor(
    @InjectModel(Truck.name) private truckModel: Model<TruckDocument>,
  ) {}

  private calculateMaxPallets(width: number, length: number): number {
    const usableLength = length - DOOR_CLEARANCE;

    const palletsWidthwise = Math.floor(width / EURO_PALLET.width);
    const palletsLengthwise = Math.floor(usableLength / EURO_PALLET.length);

    const palletsWidthwiseRotated = Math.floor(width / EURO_PALLET.length);
    const palletsLengthwiseRotated = Math.floor(
      usableLength / EURO_PALLET.width,
    );

    const orientation1 = palletsWidthwise * palletsLengthwise;
    const orientation2 = palletsWidthwiseRotated * palletsLengthwiseRotated;

    return Math.max(orientation1, orientation2);
  }

  async create(createTruckDto: ICreateTruckDto): Promise<ITruckResponse> {
    const existingTruck = await this.truckModel
      .findOne({
        $or: [
          { plateNumber: createTruckDto.plateNumber },
          { vinCode: createTruckDto.vinCode },
        ],
      })
      .exec();

    if (existingTruck) {
      throw new ConflictException(
        'Truck with this plate number or VIN code already exists',
      );
    }

    const maxPallets = this.calculateMaxPallets(
      createTruckDto.width,
      createTruckDto.length,
    );
    const truck = new this.truckModel({
      ...createTruckDto,
      maxPallets,
    });
    const savedTruck = await truck.save();
    return this.transformToResponse(savedTruck);
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
  ): Promise<ITrucksListResponse> {
    const skip = (page - 1) * pageSize;

    const trucks = await this.truckModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean<TruckLean[]>()
      .exec();

    const total = await this.truckModel.countDocuments();

    return {
      trucks: trucks.map((truck) => this.transformToResponse(truck)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string): Promise<ITruckResponse> {
    const truck = await this.truckModel.findById(id).exec();
    if (!truck) {
      throw new NotFoundException('Truck not found');
    }
    return this.transformToResponse(truck);
  }

  async findByPlateNumber(plateNumber: string): Promise<ITruckResponse> {
    const truck = await this.truckModel.findOne({ plateNumber }).exec();
    if (!truck) {
      throw new NotFoundException('Truck not found');
    }
    return this.transformToResponse(truck);
  }

  async update(
    id: string,
    updateTruckDto: ICreateTruckDto,
  ): Promise<ITruckResponse> {
    if (updateTruckDto.plateNumber || updateTruckDto.vinCode) {
      const orConditions: Array<
        { plateNumber?: string } | { vinCode?: string }
      > = [];

      if (updateTruckDto.plateNumber) {
        orConditions.push({ plateNumber: updateTruckDto.plateNumber });
      }
      if (updateTruckDto.vinCode) {
        orConditions.push({ vinCode: updateTruckDto.vinCode });
      }

      if (orConditions.length > 0) {
        const conflictQuery = {
          _id: { $ne: id },
          $or: orConditions,
        };

        const existingTruck = await this.truckModel
          .findOne(conflictQuery)
          .exec();
        if (existingTruck) {
          throw new ConflictException(
            'Truck with this plate number or VIN code already exists',
          );
        }
      }
    }

    const maxPallets = this.calculateMaxPallets(
      updateTruckDto.width,
      updateTruckDto.length,
    );

    const updateData = {
      ...updateTruckDto,
      maxPallets,
    };

    const truck = await this.truckModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!truck) {
      throw new NotFoundException('Truck not found');
    }

    return this.transformToResponse(truck);
  }

  async remove(id: string): Promise<void> {
    const truck = await this.truckModel.findByIdAndDelete(id).exec();
    if (!truck) {
      throw new NotFoundException('Truck not found');
    }
  }

  private transformToResponse(
    truck: TruckDocument | TruckLean,
  ): ITruckResponse {
    return {
      _id: (truck as TruckLean)._id.toString(),
      plateNumber: truck.plateNumber,
      vinCode: truck.vinCode,
      registrationCertificate: truck.registrationCertificate,
      driverName: truck.driverName,
      width: truck.width,
      height: truck.height,
      length: truck.length,
      maxWeight: truck.maxWeight,
      truckModel: truck.truckModel || undefined,
      manufacturingYear: truck.manufacturingYear || undefined,
      notes: truck.notes || undefined,
      isActive: truck.isActive,
      maxPallets: truck.maxPallets,
      createdAt: (truck as TruckLean).createdAt,
      updatedAt: (truck as TruckLean).updatedAt,
    };
  }
}
