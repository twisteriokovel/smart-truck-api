import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../schemas/order.schema';
import { Trip, TripDocument } from '../schemas/trip.schema';
import {
  IOrderResponse,
  IOrderDto,
  IUpdateOrderDto,
  IOrdersListResponse,
  OrderStatus,
} from '../models/order';
import { TripStatus } from '../models/trip';

type OrderLean = Order & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
  ) {}

  async create(createOrderDto: IOrderDto): Promise<IOrderResponse> {
    const order = new this.orderModel({
      ...createOrderDto,
      remainingCargo: createOrderDto.cargoSize,
      status: OrderStatus.DRAFT,
    });
    const savedOrder = await order.save();
    return this.transformToResponse(savedOrder);
  }

  async findAll(): Promise<IOrdersListResponse> {
    const orders = await this.orderModel
      .find()
      .sort({ createdAt: -1 })
      .lean<OrderLean[]>()
      .exec();

    const total = await this.orderModel.countDocuments();

    return {
      orders: orders.map((order) => this.transformToResponse(order)),
      total,
    };
  }

  async findOne(id: string): Promise<IOrderResponse> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.transformToResponse(order);
  }

  async update(
    id: string,
    updateOrderDto: IUpdateOrderDto,
  ): Promise<IOrderResponse> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot update order that is in progress');
    }

    if (updateOrderDto.cargoSize !== undefined) {
      const allocatedCargo = order.cargoSize - order.remainingCargo;
      if (updateOrderDto.cargoSize < allocatedCargo) {
        throw new BadRequestException(
          'New cargo size cannot be less than already allocated cargo',
        );
      }
      order.remainingCargo = updateOrderDto.cargoSize - allocatedCargo;
      order.cargoSize = updateOrderDto.cargoSize;
    }

    if (updateOrderDto.destinationAddressId !== undefined) {
      order.destinationAddressId = new Types.ObjectId(updateOrderDto.destinationAddressId);
    }

    if (updateOrderDto.notes !== undefined) {
      order.notes = updateOrderDto.notes;
    }

    await this.checkAndUpdateOrderStatus(order);
    const updatedOrder = await order.save();
    return this.transformToResponse(updatedOrder);
  }

  async cancel(id: string): Promise<IOrderResponse> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot cancel order that is in progress');
    }

    if (order.status === OrderStatus.DONE) {
      throw new BadRequestException('Cannot cancel completed order');
    }

    await this.tripModel.updateMany(
      { orderId: order._id },
      { status: TripStatus.CANCELLED }
    );

    order.status = OrderStatus.CANCELLED;
    const updatedOrder = await order.save();
    return this.transformToResponse(updatedOrder);
  }

  async remove(id: string): Promise<void> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot delete order that is in progress');
    }

    await this.tripModel.deleteMany({ orderId: order._id });
    await this.orderModel.findByIdAndDelete(id).exec();
  }

  async updateOrderStatusFromTrip(orderId: string): Promise<void> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      return;
    }

    await this.checkAndUpdateOrderStatus(order);
    await order.save();
  }

  private async checkAndUpdateOrderStatus(order: OrderDocument): Promise<void> {
    const trips = await this.tripModel.find({ orderId: order._id }).exec();

    if (order.remainingCargo === 0 && trips.length > 0) {
      const hasInProgressTrips = trips.some(trip => trip.status === TripStatus.IN_PROGRESS);
      const allTripsCompleted = trips.every(trip => 
        trip.status === TripStatus.DONE || trip.status === TripStatus.CANCELLED
      );
      const hasCompletedTrips = trips.some(trip => trip.status === TripStatus.DONE);

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

  private transformToResponse(
    order: OrderDocument | OrderLean,
  ): IOrderResponse {
    return {
      _id: (order as OrderLean)._id.toString(),
      cargoSize: order.cargoSize,
      remainingCargo: order.remainingCargo,
      status: order.status,
      destinationAddressId: order.destinationAddressId.toString(),
      notes: order.notes || undefined,
      trips: order.trips.map(trip => trip.toString()),
      createdAt: (order as OrderLean).createdAt,
      updatedAt: (order as OrderLean).updatedAt,
    };
  }
}