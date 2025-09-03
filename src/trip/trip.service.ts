import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Trip, TripDocument } from '../schemas/trip.schema';
import { Order, OrderDocument } from '../schemas/order.schema';
import { Truck, TruckDocument } from '../schemas/truck.schema';
import {
  ITripResponse,
  ITripDto,
  IUpdateTripDto,
  IFinishTripDto,
  ITripsListResponse,
  TripStatus,
} from '../models/trip';
import { OrderStatus } from '../models/order';

type TripLean = Trip & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class TripService {
  constructor(
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Truck.name) private truckModel: Model<TruckDocument>,
  ) {}

  async create(createTripDto: ITripDto): Promise<ITripResponse> {
    const order = await this.orderModel.findById(createTripDto.orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.DONE) {
      throw new BadRequestException('Cannot add trip to completed order');
    }

    if (createTripDto.cargoSize > order.remainingCargo) {
      throw new BadRequestException(
        'Trip cargo size cannot exceed remaining cargo in order',
      );
    }

    const truck = await this.truckModel.findById(createTripDto.truckId).exec();
    if (!truck) {
      throw new NotFoundException('Truck not found');
    }

    if (!truck.isActive) {
      throw new BadRequestException('Truck is not active');
    }

    if (createTripDto.cargoSize > truck.maxPallets) {
      throw new BadRequestException('Trip cargo size exceeds truck capacity');
    }

    const conflictingTrip = await this.tripModel
      .findOne({
        truckId: createTripDto.truckId,
        status: { $in: [TripStatus.NEW, TripStatus.IN_PROGRESS] },
        startTime: {
          $lte: new Date(
            createTripDto.startTime.getTime() + 24 * 60 * 60 * 1000,
          ),
          $gte: new Date(
            createTripDto.startTime.getTime() - 24 * 60 * 60 * 1000,
          ),
        },
      })
      .exec();

    if (conflictingTrip) {
      throw new ConflictException(
        'Truck is already assigned to another trip at this time',
      );
    }

    const trip = new this.tripModel({
      ...createTripDto,
      status: TripStatus.NEW,
    });

    const savedTrip = await trip.save();

    order.remainingCargo -= createTripDto.cargoSize;
    order.trips.push(savedTrip._id as Types.ObjectId);
    await this.checkAndUpdateOrderStatus(order);
    await order.save();

    return this.transformToResponse(savedTrip);
  }

  async findAll(): Promise<ITripsListResponse> {
    const trips = await this.tripModel
      .find()
      .sort({ startTime: -1 })
      .lean<TripLean[]>()
      .exec();

    const total = await this.tripModel.countDocuments();

    return {
      trips: trips.map((trip) => this.transformToResponse(trip)),
      total,
    };
  }

  async findByOrder(orderId: string): Promise<ITripsListResponse> {
    const trips = await this.tripModel
      .find({ orderId })
      .sort({ startTime: -1 })
      .lean<TripLean[]>()
      .exec();

    return {
      trips: trips.map((trip) => this.transformToResponse(trip)),
      total: trips.length,
    };
  }

  async findOne(id: string): Promise<ITripResponse> {
    const trip = await this.tripModel.findById(id).exec();
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }
    return this.transformToResponse(trip);
  }

  async start(id: string): Promise<ITripResponse> {
    const trip = await this.tripModel.findById(id).exec();
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status !== TripStatus.NEW) {
      throw new BadRequestException('Trip is not in NEW status');
    }

    trip.status = TripStatus.IN_PROGRESS;
    const updatedTrip = await trip.save();

    const order = await this.orderModel.findById(trip.orderId).exec();
    if (order) {
      await this.checkAndUpdateOrderStatus(order);
      await order.save();
    }

    return this.transformToResponse(updatedTrip);
  }

  async finish(
    id: string,
    finishTripDto: IFinishTripDto,
  ): Promise<ITripResponse> {
    const trip = await this.tripModel.findById(id).exec();
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status !== TripStatus.IN_PROGRESS) {
      throw new BadRequestException('Trip is not in progress');
    }

    trip.status = TripStatus.DONE;
    trip.actualEndTime = finishTripDto.actualEndTime;
    trip.actualFuel = finishTripDto.actualFuel;
    trip.actualTimeSpent = finishTripDto.actualTimeSpent;
    trip.notes = finishTripDto.notes;

    const updatedTrip = await trip.save();

    const order = await this.orderModel.findById(trip.orderId).exec();
    if (order) {
      await this.checkAndUpdateOrderStatus(order);
      await order.save();
    }

    return this.transformToResponse(updatedTrip);
  }

  async cancel(id: string): Promise<ITripResponse> {
    const trip = await this.tripModel.findById(id).exec();
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status === TripStatus.DONE) {
      throw new BadRequestException('Cannot cancel completed trip');
    }

    const order = await this.orderModel.findById(trip.orderId).exec();
    if (order) {
      order.remainingCargo += trip.cargoSize;
      order.trips = order.trips.filter(
        (tripId) => !tripId.equals(trip._id as Types.ObjectId),
      );
      await this.checkAndUpdateOrderStatus(order);
      await order.save();
    }

    trip.status = TripStatus.CANCELLED;
    const updatedTrip = await trip.save();

    return this.transformToResponse(updatedTrip);
  }

  async update(
    id: string,
    updateTripDto: IUpdateTripDto,
  ): Promise<ITripResponse> {
    const trip = await this.tripModel.findById(id).exec();
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status === TripStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot update trip that is in progress');
    }

    if (trip.status === TripStatus.DONE) {
      throw new BadRequestException('Cannot update completed trip');
    }

    if (updateTripDto.cargoSize !== undefined) {
      const order = await this.orderModel.findById(trip.orderId).exec();
      if (order) {
        const newRemainingCargo =
          order.remainingCargo + trip.cargoSize - updateTripDto.cargoSize;
        if (newRemainingCargo < 0) {
          throw new BadRequestException(
            'Updated cargo size would exceed available cargo in order',
          );
        }
        order.remainingCargo = newRemainingCargo;
        await order.save();
      }
      trip.cargoSize = updateTripDto.cargoSize;
    }

    if (updateTripDto.startTime !== undefined) {
      trip.startTime = updateTripDto.startTime;
    }

    if (updateTripDto.plannedFuel !== undefined) {
      trip.plannedFuel = updateTripDto.plannedFuel;
    }

    const updatedTrip = await trip.save();

    if (updateTripDto.cargoSize !== undefined) {
      const order = await this.orderModel.findById(trip.orderId).exec();
      if (order) {
        await this.checkAndUpdateOrderStatus(order);
        await order.save();
      }
    }

    return this.transformToResponse(updatedTrip);
  }

  async remove(id: string): Promise<void> {
    const trip = await this.tripModel.findById(id).exec();
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status === TripStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot delete trip that is in progress');
    }

    const order = await this.orderModel.findById(trip.orderId).exec();
    if (order) {
      order.remainingCargo += trip.cargoSize;
      order.trips = order.trips.filter(
        (tripId) => !tripId.equals(trip._id as Types.ObjectId),
      );
      await this.checkAndUpdateOrderStatus(order);
      await order.save();
    }

    await this.tripModel.findByIdAndDelete(id).exec();
  }

  private async checkAndUpdateOrderStatus(order: OrderDocument): Promise<void> {
    const trips = await this.tripModel.find({ orderId: order._id }).exec();

    if (order.remainingCargo === 0 && trips.length > 0) {
      const hasInProgressTrips = trips.some(
        (trip) => trip.status === TripStatus.IN_PROGRESS,
      );
      const allTripsCompleted = trips.every(
        (trip) =>
          trip.status === TripStatus.DONE ||
          trip.status === TripStatus.CANCELLED,
      );
      const hasCompletedTrips = trips.some(
        (trip) => trip.status === TripStatus.DONE,
      );

      if (hasInProgressTrips) {
        order.status = OrderStatus.IN_PROGRESS;
      } else if (allTripsCompleted && hasCompletedTrips) {
        order.status = OrderStatus.DONE;
      } else {
        order.status = OrderStatus.NEW;
      }
    } else if (order.remainingCargo === 0) {
      order.status = OrderStatus.NEW;
    } else {
      order.status = OrderStatus.DRAFT;
    }
  }

  private transformToResponse(trip: TripDocument | TripLean): ITripResponse {
    return {
      _id: (trip as TripLean)._id.toString(),
      orderId: trip.orderId.toString(),
      truckId: trip.truckId.toString(),
      cargoSize: trip.cargoSize,
      status: trip.status,
      startTime: trip.startTime,
      plannedFuel: trip.plannedFuel,
      actualEndTime: trip.actualEndTime || undefined,
      actualFuel: trip.actualFuel || undefined,
      actualTimeSpent: trip.actualTimeSpent || undefined,
      notes: trip.notes || undefined,
      createdAt: (trip as TripLean).createdAt,
      updatedAt: (trip as TripLean).updatedAt,
    };
  }
}
