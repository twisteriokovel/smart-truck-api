import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Trip, TripDocument } from '../schemas/trip.schema';
import { Order, OrderDocument } from '../schemas/order.schema';
import { Truck, TruckDocument } from '../schemas/truck.schema';
import { ITripResponse, ITripsListResponse, TripStatus } from '../models/trip';
import { OrderStatus } from '../models/order';
import { CreateTripDto, UpdateTripDto, CompleteTripDto } from './dto';
import {
  IAvailableTruck,
  ITruckScheduleInfo,
  ITruckScheduleConflict,
} from './interfaces/truck-availability.interface';
import { CounterService } from '../utils/counter.service';

type TripLean = Trip & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

type TruckLean = Truck & {
  _id: Types.ObjectId;
};

type PopulatedTruck = {
  _id: Types.ObjectId;
  plateNumber: string;
  vinCode: string;
  registrationCertificate: string;
  driverName: string;
  width: number;
  height: number;
  length: number;
  maxWeight: number;
  truckModel?: string;
  model?: string;
  fuelCapacity?: number;
  manufacturingYear?: number;
  notes?: string;
  isActive: boolean;
  maxPallets: number;
};

@Injectable()
export class TripService {
  constructor(
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Truck.name) private truckModel: Model<TruckDocument>,
    private counterService: CounterService,
  ) {}

  async createTripForOrder(
    orderId: string,
    createTripDto: CreateTripDto,
  ): Promise<ITripResponse> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot add trip to cancelled order');
    }

    if (createTripDto.palletIds && createTripDto.palletIds.length > 0) {
      await this.validatePalletIds(order, createTripDto.palletIds);
      await this.validatePalletDimensions(
        createTripDto.truckId,
        order,
        createTripDto.palletIds,
      );
    }

    await this.validateTruckAvailability(createTripDto.truckId);

    const tripNumber = await this.counterService.generateTripNumber();

    const trip = new this.tripModel({
      orderId: new Types.ObjectId(orderId),
      truckId: new Types.ObjectId(createTripDto.truckId),
      tripNumber,
      palletIds: createTripDto.palletIds || [],
      startDate: new Date(createTripDto.startDate),
      estimatedFuel: createTripDto.estimatedFuel,
      estimatedDuration: createTripDto.estimatedDuration,
      notes: createTripDto.notes,
      status: TripStatus.PLANNED,
    });

    const savedTrip = await trip.save();

    if (createTripDto.palletIds && createTripDto.palletIds.length > 0) {
      this.markPalletsAsAssigned(order, createTripDto.palletIds);
    }
    order.trips.push(savedTrip._id as Types.ObjectId);
    await this.updateOrderStatus(order);
    await order.save();

    return this.transformToResponse(savedTrip);
  }

  async findTripsByOrder(orderId: string): Promise<ITripResponse[]> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const trips = await this.tripModel
      .find({ orderId: new Types.ObjectId(orderId) })
      .populate('truckId')
      .sort({ startDate: 1 })
      .lean()
      .exec();

    return trips.map((trip) => this.transformToResponse(trip));
  }

  async findAllTrips(
    page: number = 1,
    pageSize: number = 10,
  ): Promise<ITripsListResponse> {
    const skip = (page - 1) * pageSize;

    const trips = await this.tripModel
      .find()
      .populate('truckId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean()
      .exec();

    const total = await this.tripModel.countDocuments();

    return {
      trips: trips.map((trip) => this.transformToResponse(trip)),
      total,
    };
  }

  async findTripByOrderAndId(
    orderId: string,
    tripId: string,
  ): Promise<ITripResponse> {
    const trip = await this.tripModel
      .findOne({
        _id: new Types.ObjectId(tripId),
        orderId: new Types.ObjectId(orderId),
      })
      .populate('truckId')
      .lean()
      .exec();

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return this.transformToResponse(trip);
  }

  async updateTrip(
    orderId: string,
    tripId: string,
    updateTripDto: UpdateTripDto,
  ): Promise<ITripResponse> {
    const trip = await this.tripModel
      .findOne({
        _id: new Types.ObjectId(tripId),
        orderId: new Types.ObjectId(orderId),
      })
      .exec();

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status !== TripStatus.PLANNED) {
      throw new BadRequestException('Only planned trips can be edited');
    }

    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (updateTripDto.palletIds !== undefined) {
      // Unassign current pallets
      if (trip.palletIds.length > 0) {
        this.markPalletsAsUnassigned(order, trip.palletIds);
      }

      // Validate and assign new pallets (if any)
      if (updateTripDto.palletIds.length > 0) {
        await this.validatePalletIds(order, updateTripDto.palletIds);
        await this.validateTripCapacity(trip, updateTripDto.palletIds);
        this.markPalletsAsAssigned(order, updateTripDto.palletIds);
      }

      trip.palletIds = updateTripDto.palletIds;
    }

    if (
      updateTripDto.truckId &&
      updateTripDto.truckId !== trip.truckId.toString()
    ) {
      await this.validateTruckAvailability(updateTripDto.truckId);
      trip.truckId = new Types.ObjectId(updateTripDto.truckId);
    }

    if (updateTripDto.startDate) {
      trip.startDate = new Date(updateTripDto.startDate);
    }

    if (updateTripDto.estimatedFuel !== undefined) {
      trip.estimatedFuel = updateTripDto.estimatedFuel;
    }

    if (updateTripDto.estimatedDuration !== undefined) {
      trip.estimatedDuration = updateTripDto.estimatedDuration;
    }

    if (updateTripDto.notes !== undefined) {
      trip.notes = updateTripDto.notes;
    }

    const updatedTrip = await trip.save();
    await this.updateOrderStatus(order);
    await order.save();

    return this.transformToResponse(updatedTrip);
  }

  async deleteTrip(orderId: string, tripId: string): Promise<void> {
    const trip = await this.tripModel
      .findOne({
        _id: new Types.ObjectId(tripId),
        orderId: new Types.ObjectId(orderId),
      })
      .exec();

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status === TripStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot delete trip that is in progress');
    }

    const order = await this.orderModel.findById(orderId).exec();
    if (order) {
      this.markPalletsAsUnassigned(order, trip.palletIds);
      order.trips = order.trips.filter(
        (id) => !id.equals(trip._id as Types.ObjectId),
      );
      await this.updateOrderStatus(order);
      await order.save();
    }

    await this.tripModel.findByIdAndDelete(tripId).exec();
  }

  async updateTripStatus(
    orderId: string,
    tripId: string,
    status: TripStatus,
  ): Promise<ITripResponse> {
    const trip = await this.tripModel
      .findOne({
        _id: new Types.ObjectId(tripId),
        orderId: new Types.ObjectId(orderId),
      })
      .exec();

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status === status) {
      return this.transformToResponse(trip);
    }

    this.validateStatusTransition(trip.status, status);

    trip.status = status;
    const updatedTrip = await trip.save();

    const order = await this.orderModel.findById(orderId).exec();
    if (order) {
      await this.updateOrderStatus(order);
      await order.save();
    }

    return this.transformToResponse(updatedTrip);
  }

  async startTrip(orderId: string, tripId: string): Promise<ITripResponse> {
    const trip = await this.tripModel
      .findOne({
        _id: new Types.ObjectId(tripId),
        orderId: new Types.ObjectId(orderId),
      })
      .exec();

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status !== TripStatus.PLANNED) {
      throw new BadRequestException('Only planned trips can be started');
    }

    return this.updateTripStatus(orderId, tripId, TripStatus.IN_PROGRESS);
  }

  async cancelTrip(orderId: string, tripId: string): Promise<ITripResponse> {
    const trip = await this.tripModel
      .findOne({
        _id: new Types.ObjectId(tripId),
        orderId: new Types.ObjectId(orderId),
      })
      .exec();

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status === TripStatus.DONE) {
      throw new BadRequestException('Cannot cancel completed trip');
    }

    if (trip.status !== TripStatus.CANCELLED) {
      const order = await this.orderModel.findById(orderId).exec();
      if (order) {
        this.markPalletsAsUnassigned(order, trip.palletIds);
        await this.updateOrderStatus(order);
        await order.save();
      }
    }

    return this.updateTripStatus(orderId, tripId, TripStatus.CANCELLED);
  }

  async completeTrip(
    orderId: string,
    tripId: string,
    completeTripDto: CompleteTripDto,
  ): Promise<ITripResponse> {
    const trip = await this.tripModel
      .findOne({
        _id: new Types.ObjectId(tripId),
        orderId: new Types.ObjectId(orderId),
      })
      .exec();

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status !== TripStatus.IN_PROGRESS) {
      throw new BadRequestException('Trip must be in progress to complete');
    }

    trip.status = TripStatus.DONE;
    if (completeTripDto.actualFuel !== undefined) {
      trip.actualFuel = completeTripDto.actualFuel;
    }
    if (completeTripDto.actualDuration !== undefined) {
      trip.actualDuration = completeTripDto.actualDuration;
    }

    const updatedTrip = await trip.save();

    const order = await this.orderModel.findById(orderId).exec();
    if (order) {
      await this.updateOrderStatus(order);
      await order.save();
    }

    return this.transformToResponse(updatedTrip);
  }

  async getAvailableTrucksForOrder(
    orderId: string,
  ): Promise<IAvailableTruck[]> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const trucks = await this.truckModel
      .find({ isActive: true })
      .lean<TruckLean[]>()
      .exec();

    const busyTruckIds = await this.tripModel
      .find({
        status: { $in: [TripStatus.PLANNED, TripStatus.IN_PROGRESS] },
      })
      .distinct('truckId')
      .exec();

    const availableTrucks: IAvailableTruck[] = [];

    for (const truck of trucks) {
      const isAvailable = !busyTruckIds.some((busyTruckId) =>
        busyTruckId.equals(truck._id),
      );

      if (isAvailable) {
        availableTrucks.push({
          _id: truck._id.toString(),
          model: truck.model || truck.truckModel || 'Unknown',
          plateNumber: truck.plateNumber || 'Unknown',
          maxPallets: truck.maxPallets,
          availableCapacity: truck.maxPallets,
          maxWeight: truck.maxWeight,
          width: truck.width,
          height: truck.height,
          length: truck.length,
          fuelCapacity: truck.fuelCapacity,
          isActive: truck.isActive,
          scheduleInfo: { isAvailable: true, conflicts: [] },
        });
      }
    }

    return availableTrucks;
  }

  private async getAssignedPalletsForOrder(orderId: string): Promise<string[]> {
    const trips = await this.tripModel
      .find({
        orderId: new Types.ObjectId(orderId),
        status: { $in: [TripStatus.PLANNED, TripStatus.IN_PROGRESS] },
      })
      .exec();

    return trips.flatMap((trip) => trip.palletIds);
  }

  private async validateTripCapacity(
    trip: TripDocument,
    palletIds: string[],
  ): Promise<void> {
    const truck = await this.truckModel.findById(trip.truckId).exec();
    if (!truck) {
      throw new NotFoundException('Truck not found');
    }

    if (palletIds.length > truck.maxPallets) {
      throw new BadRequestException(
        `Trip cannot carry ${palletIds.length} pallets. Truck capacity: ${truck.maxPallets} pallets`,
      );
    }

    const order = await this.orderModel.findById(trip.orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Get pallets data from order
    const pallets = order.pallets.filter((p) => palletIds.includes(p.id));

    const totalWeight = pallets.reduce((sum, pallet) => sum + pallet.weight, 0);
    if (totalWeight > truck.maxWeight) {
      throw new BadRequestException(
        `Trip total weight ${totalWeight}kg exceeds truck capacity: ${truck.maxWeight}kg`,
      );
    }

    const tallestPalletCm = Math.max(...pallets.map((p) => p.height));
    const tallestPalletM = tallestPalletCm / 100;
    if (tallestPalletM > truck.height) {
      const tallPallets = pallets.filter((p) => p.height / 100 > truck.height);
      throw new BadRequestException(
        `Pallet height ${tallestPalletCm}cm (${tallestPalletM}m) exceeds truck height capacity: ${truck.height}m. ` +
          `Incompatible pallets: ${tallPallets.map((p) => p.id).join(', ')}. ` +
          `Please select a truck with height >= ${tallestPalletM}m`,
      );
    }
  }

  private async validatePalletIds(
    order: OrderDocument,
    palletIds: string[],
  ): Promise<void> {
    const orderPalletIds = order.pallets.map((p) => p.id);
    const invalidPallets = palletIds.filter(
      (id) => !orderPalletIds.includes(id),
    );

    if (invalidPallets.length > 0) {
      throw new BadRequestException(
        `Pallets not found in order: ${invalidPallets.join(', ')}`,
      );
    }

    const assignedTrips = await this.tripModel
      .find({
        orderId: order._id,
        status: { $in: [TripStatus.PLANNED, TripStatus.IN_PROGRESS] },
      })
      .exec();

    const assignedPalletIds = assignedTrips.flatMap((trip) => trip.palletIds);
    const alreadyAssigned = palletIds.filter((id) =>
      assignedPalletIds.includes(id),
    );

    if (alreadyAssigned.length > 0) {
      throw new BadRequestException(
        `Pallets already assigned to other trips: ${alreadyAssigned.join(', ')}`,
      );
    }
  }

  private async validateTruckAvailability(truckId: string): Promise<void> {
    const truck = await this.truckModel.findById(truckId).exec();
    if (!truck) {
      throw new NotFoundException('Truck not found');
    }

    if (!truck.isActive) {
      throw new BadRequestException('Truck is not active');
    }
  }

  private validateStatusTransition(
    currentStatus: TripStatus,
    newStatus: TripStatus,
  ): void {
    const validTransitions: Record<TripStatus, TripStatus[]> = {
      [TripStatus.PLANNED]: [TripStatus.IN_PROGRESS, TripStatus.CANCELLED],
      [TripStatus.IN_PROGRESS]: [TripStatus.DONE, TripStatus.CANCELLED],
      [TripStatus.DONE]: [],
      [TripStatus.CANCELLED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private markPalletsAsAssigned(
    order: OrderDocument,
    palletIds: string[],
  ): void {
    // This is a placeholder - in a real implementation, you might want to track
    // pallet assignment status more explicitly in the order schema
  }

  private markPalletsAsUnassigned(
    order: OrderDocument,
    palletIds: string[],
  ): void {
    // This is a placeholder - in a real implementation, you might want to track
    // pallet assignment status more explicitly in the order schema
  }

  private async updateOrderStatus(order: OrderDocument): Promise<void> {
    const trips = await this.tripModel.find({ orderId: order._id }).exec();

    if (trips.length === 0) {
      order.status = OrderStatus.DRAFT;
      return;
    }

    const hasInProgressTrips = trips.some(
      (trip) => trip.status === TripStatus.IN_PROGRESS,
    );
    const allTripsCompleted = trips.every(
      (trip) =>
        trip.status === TripStatus.DONE || trip.status === TripStatus.CANCELLED,
    );
    const hasCompletedTrips = trips.some(
      (trip) => trip.status === TripStatus.DONE,
    );

    const assignedPalletIds = trips
      .filter((trip) => trip.status !== TripStatus.CANCELLED)
      .flatMap((trip) => trip.palletIds);
    const allPalletsAssigned = order.pallets.every((pallet) =>
      assignedPalletIds.includes(pallet.id),
    );

    if (hasInProgressTrips) {
      order.status = OrderStatus.IN_PROGRESS;
    } else if (allTripsCompleted && hasCompletedTrips && allPalletsAssigned) {
      order.status = OrderStatus.DONE;
    } else if (allPalletsAssigned) {
      order.status = OrderStatus.NEW;
    } else {
      order.status = OrderStatus.DRAFT;
    }
  }

  private transformToResponse(trip: TripDocument | TripLean): ITripResponse {
    const truck = trip.truckId as Types.ObjectId | PopulatedTruck;

    if (this.isPopulatedTruck(truck)) {
      return {
        _id: (trip as TripLean)._id.toString(),
        tripNumber: trip.tripNumber,
        orderId: trip.orderId.toString(),
        truckId: truck._id.toString(),
        truck: {
          _id: truck._id.toString(),
          plateNumber: truck.plateNumber,
          vinCode: truck.vinCode,
          registrationCertificate: truck.registrationCertificate,
          driverName: truck.driverName,
          width: truck.width,
          height: truck.height,
          length: truck.length,
          maxWeight: truck.maxWeight,
          truckModel: truck.truckModel,
          model: truck.model,
          fuelCapacity: truck.fuelCapacity,
          manufacturingYear: truck.manufacturingYear,
          notes: truck.notes,
          isActive: truck.isActive,
          maxPallets: truck.maxPallets,
        },
        status: trip.status,
        startDate: trip.startDate,
        palletIds: trip.palletIds,
        estimatedFuel: trip.estimatedFuel,
        estimatedDuration: trip.estimatedDuration,
        actualFuel: trip.actualFuel,
        actualDuration: trip.actualDuration,
        notes: trip.notes,
        createdAt: (trip as TripLean).createdAt,
        updatedAt: (trip as TripLean).updatedAt,
      };
    } else {
      return {
        _id: (trip as TripLean)._id.toString(),
        tripNumber: trip.tripNumber,
        orderId: trip.orderId.toString(),
        truckId: truck.toString(),
        truck: {
          _id: '',
          plateNumber: 'Unknown',
          vinCode: 'Unknown',
          registrationCertificate: 'Unknown',
          driverName: 'Unknown',
          width: 0,
          height: 0,
          length: 0,
          maxWeight: 0,
          truckModel: undefined,
          model: undefined,
          fuelCapacity: undefined,
          manufacturingYear: undefined,
          notes: undefined,
          isActive: false,
          maxPallets: 0,
        },
        status: trip.status,
        startDate: trip.startDate,
        palletIds: trip.palletIds,
        estimatedFuel: trip.estimatedFuel,
        estimatedDuration: trip.estimatedDuration,
        actualFuel: trip.actualFuel,
        actualDuration: trip.actualDuration,
        notes: trip.notes,
        createdAt: (trip as TripLean).createdAt,
        updatedAt: (trip as TripLean).updatedAt,
      };
    }
  }

  private isPopulatedTruck(
    truckId: Types.ObjectId | PopulatedTruck,
  ): truckId is PopulatedTruck {
    return typeof truckId === 'object' && 'plateNumber' in truckId;
  }

  async findTripById(tripId: string): Promise<ITripResponse> {
    const trip = await this.tripModel
      .findById(tripId)
      .populate('truckId')
      .lean()
      .exec();

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return this.transformToResponse(trip);
  }

  async updateTripById(
    tripId: string,
    updateTripDto: UpdateTripDto,
  ): Promise<ITripResponse> {
    const trip = await this.tripModel.findById(tripId).exec();
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status !== TripStatus.PLANNED) {
      throw new BadRequestException('Only planned trips can be edited');
    }

    const order = await this.orderModel.findById(trip.orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (updateTripDto.palletIds !== undefined) {
      if (trip.palletIds.length > 0) {
        this.markPalletsAsUnassigned(order, trip.palletIds);
      }

      if (updateTripDto.palletIds.length > 0) {
        const newPallets = updateTripDto.palletIds.filter(
          (palletId) => !trip.palletIds.includes(palletId),
        );

        if (newPallets.length > 0) {
          await this.validatePalletIds(order, newPallets);
        }

        await this.validateTripCapacity(trip, updateTripDto.palletIds);
        this.markPalletsAsAssigned(order, updateTripDto.palletIds);
      }

      trip.palletIds = updateTripDto.palletIds;
    }

    if (
      updateTripDto.truckId &&
      updateTripDto.truckId !== trip.truckId.toString()
    ) {
      await this.validateTruckAvailability(updateTripDto.truckId);
      trip.truckId = new Types.ObjectId(updateTripDto.truckId);
    }

    if (updateTripDto.startDate) {
      trip.startDate = new Date(updateTripDto.startDate);
    }

    if (updateTripDto.estimatedFuel !== undefined) {
      trip.estimatedFuel = updateTripDto.estimatedFuel;
    }

    if (updateTripDto.estimatedDuration !== undefined) {
      trip.estimatedDuration = updateTripDto.estimatedDuration;
    }

    if (updateTripDto.notes !== undefined) {
      trip.notes = updateTripDto.notes;
    }

    const updatedTrip = await trip.save();
    await this.updateOrderStatus(order);
    await order.save();

    const tripWithTruck = await this.tripModel
      .findById(updatedTrip._id)
      .populate('truckId')
      .lean<TripLean>()
      .exec();

    if (!tripWithTruck) {
      throw new NotFoundException('Trip not found after update');
    }

    return this.transformToResponse(tripWithTruck);
  }

  async deleteTripById(tripId: string): Promise<void> {
    const trip = await this.tripModel.findById(tripId).exec();
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status === TripStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot delete trip that is in progress');
    }

    const order = await this.orderModel.findById(trip.orderId).exec();
    if (order) {
      this.markPalletsAsUnassigned(order, trip.palletIds);
      order.trips = order.trips.filter(
        (id) => !id.equals(trip._id as Types.ObjectId),
      );
      await this.updateOrderStatus(order);
      await order.save();
    }

    await this.tripModel.findByIdAndDelete(tripId).exec();
  }

  async updateTripStatusById(
    tripId: string,
    status: TripStatus,
  ): Promise<ITripResponse> {
    const trip = await this.tripModel.findById(tripId).exec();
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status === status) {
      return this.transformToResponse(trip);
    }

    this.validateStatusTransition(trip.status, status);

    trip.status = status;
    const updatedTrip = await trip.save();

    const order = await this.orderModel.findById(trip.orderId).exec();
    if (order) {
      await this.updateOrderStatus(order);
      await order.save();
    }

    return this.transformToResponse(updatedTrip);
  }

  async startTripById(tripId: string): Promise<ITripResponse> {
    const trip = await this.tripModel.findById(tripId).exec();
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status !== TripStatus.PLANNED) {
      throw new BadRequestException('Only planned trips can be started');
    }

    return this.updateTripStatusById(tripId, TripStatus.IN_PROGRESS);
  }

  async completeTripById(
    tripId: string,
    completeTripDto: CompleteTripDto,
  ): Promise<ITripResponse> {
    const trip = await this.tripModel.findById(tripId).exec();
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status !== TripStatus.IN_PROGRESS) {
      throw new BadRequestException('Trip must be in progress to complete');
    }

    trip.status = TripStatus.DONE;
    if (completeTripDto.actualFuel !== undefined) {
      trip.actualFuel = completeTripDto.actualFuel;
    }
    if (completeTripDto.actualDuration !== undefined) {
      trip.actualDuration = completeTripDto.actualDuration;
    }

    const updatedTrip = await trip.save();

    const order = await this.orderModel.findById(trip.orderId).exec();
    if (order) {
      await this.updateOrderStatus(order);
      await order.save();
    }

    return this.transformToResponse(updatedTrip);
  }

  private async validatePalletDimensions(
    truckId: string,
    order: OrderDocument,
    palletIds: string[],
  ): Promise<void> {
    const truck = await this.truckModel.findById(truckId).exec();
    if (!truck) {
      throw new NotFoundException('Truck not found');
    }

    const pallets = order.pallets.filter((p) => palletIds.includes(p.id));

    const totalWeight = pallets.reduce((sum, pallet) => sum + pallet.weight, 0);
    if (totalWeight > truck.maxWeight) {
      throw new BadRequestException(
        `Trip total weight ${totalWeight}kg exceeds truck capacity: ${truck.maxWeight}kg`,
      );
    }

    const tallestPalletCm = Math.max(...pallets.map((p) => p.height));
    const tallestPalletM = tallestPalletCm / 100; // Convert cm to meters
    if (tallestPalletM > truck.height) {
      const tallPallets = pallets.filter((p) => p.height / 100 > truck.height);
      throw new BadRequestException(
        `Pallet height ${tallestPalletCm}cm (${tallestPalletM}m) exceeds truck height capacity: ${truck.height}m. ` +
          `Incompatible pallets: ${tallPallets.map((p) => p.id).join(', ')}. ` +
          `Please select a truck with height >= ${tallestPalletM}m`,
      );
    }
  }
}
