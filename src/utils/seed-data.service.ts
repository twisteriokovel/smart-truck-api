import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../schemas/order.schema';
import { Trip, TripDocument } from '../schemas/trip.schema';
import { Truck, TruckDocument } from '../schemas/truck.schema';
import { Address, AddressDocument } from '../schemas/address.schema';
import { OrderStatus, IPallet } from '../models/order';
import { TripStatus } from '../models/trip';
import { CounterService } from './counter.service';

const addressesData = {
  '68ee1a4f493031c91ab8ddb4': {
    city: 'Житомир',
    range: 140, // км
    time: 2, // години
  },
  '68ee1a43493031c91ab8ddb2': {
    city: 'Суми',
    range: 350, // км
    time: 5, // години
  },
  '68ee1a3c493031c91ab8ddb0': {
    city: 'Кропивницький',
    range: 310, // км
    time: 4.5, // години
  },
  '68ee1a39493031c91ab8ddae': {
    city: 'Вінниця',
    range: 270, // км
    time: 5, // години
  },
  '68ee1a1f493031c91ab8dda9': {
    city: 'Полтава',
    range: 340, // км
    time: 4.5, // години
  },
  '68c593a37bfb49e53b71c924': {
    city: 'Чернівці',
    range: 470, // км
    time: 12, // години
  },
  '68c588f18b086a91a8eb0eed': {
    city: 'Запоріжжя',
    range: 520, // км
    time: 11, // години
  },
  '68c5889b8b086a91a8eb0ee6': {
    city: 'Дніпро',
    range: 480, // км
    time: 10, // години
  },
  '68c5881e8b086a91a8eb0ee2': {
    city: 'Харків',
    range: 480, // км
    time: 6, // години
  },
  '68c586e58b086a91a8eb0ed4': {
    city: 'Одеса',
    range: 480, // км
    time: 7, // години
  },
  '689863f2dd3ee17c497f10e3': {
    city: 'Lviv',
    range: 540, // км
    time: 8, // години
  },
};

const trucksData = {
  '68ee1959493031c91ab8dda1': {
    model: 'Iveco Eurocargo 75E',
    consumption: 18, // л/100км
    averageSpeed: 75, // км/год
  },
  '68ee1941493031c91ab8dd9b': {
    model: 'Hyundai HD65',
    consumption: 15, // л/100км
    averageSpeed: 70, // км/год
  },
  '68ee1926493031c91ab8dd98': {
    model: 'Isuzu NPR',
    consumption: 16, // л/100км
    averageSpeed: 75, // км/год
  },
  '68ee18da493031c91ab8dd86': {
    model: 'MAN',
    consumption: 28, // л/100км
    averageSpeed: 80, // км/год
  },
  '68ee18a6493031c91ab8dd80': {
    model: 'МАЗ-5440',
    consumption: 30, // л/100км
    averageSpeed: 80, // км/год
  },
  '68ee1874493031c91ab8dd76': {
    model: 'МАЗ-6312',
    consumption: 32, // л/100км
    averageSpeed: 75, // км/год
  },
  '68ee16ea493031c91ab8dd66': {
    model: 'Volvo FH16',
    consumption: 30, // л/100км
    averageSpeed: 85, // км/год
  },
  '68e79bce50a4d988df7d65e8': {
    model: 'Volvo FL',
    consumption: 20, // л/100км
    averageSpeed: 80, // км/год
  },
  '68e79b6d50a4d988df7d65e3': {
    model: 'Isuzu N-Series',
    consumption: 14, // л/100км
    averageSpeed: 70, // км/год
  },
  '68e79b2450a4d988df7d65de': {
    model: 'Mercedes Sprinter',
    consumption: 11, // л/100км
    averageSpeed: 90, // км/год
  },
  '68e79ad750a4d988df7d65d9': {
    model: 'Ford Transit',
    consumption: 10, // л/100км
    averageSpeed: 90, // км/год
  },
  '68c82cff143c5df8853c64ed': {
    model: 'Volvo FH 460',
    consumption: 28, // л/100км
    averageSpeed: 85, // км/год
  },
  '68c82c85c5ee10bdfa265f07': {
    model: 'Mercedes-Benz Actros 1845',
    consumption: 28, // л/100км
    averageSpeed: 85, // км/год
  },
};

@Injectable()
export class SeedDataService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    @InjectModel(Truck.name) private truckModel: Model<TruckDocument>,
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
    private counterService: CounterService,
  ) {}

  async seedOrdersAndTrips(monthsBack: number = 3): Promise<void> {
    console.log('Starting historical data seeding for statistics...');

    // Get existing trucks and addresses
    const trucks = await this.truckModel.find({ isActive: true }).exec();
    const addresses = await this.addressModel.find().exec();

    if (trucks.length === 0) {
      throw new Error('No active trucks found. Please add trucks first.');
    }

    if (addresses.length === 0) {
      throw new Error('No addresses found. Please add addresses first.');
    }

    console.log(
      `Found ${trucks.length} trucks and ${addresses.length} addresses`,
    );

    // Generate orders and trips for the past months
    const ordersToCreate = this.calculateOrdersToCreate(monthsBack);
    console.log(
      `Creating ${ordersToCreate} historical orders for the past ${monthsBack} months`,
    );
    console.log(
      'Note: Only generating DONE or CANCELLED orders for statistics',
    );

    for (let i = 0; i < ordersToCreate; i++) {
      const orderDate = this.getRandomDateInPast(monthsBack);
      await this.createOrderWithTrips(orderDate, trucks, addresses);

      // Add some delay to show progress
      if (i % 10 === 0) {
        console.log(`Created ${i + 1}/${ordersToCreate} orders...`);
      }
    }

    console.log('Historical data seeding completed successfully!');
  }

  private calculateOrdersToCreate(monthsBack: number): number {
    // Realistic number: ~40-60 orders per month
    return Math.floor(Math.random() * 20 + 40) * monthsBack;
  }

  private getRandomDateInPast(monthsBack: number): Date {
    const now = new Date();
    const pastDate = new Date(
      now.getTime() - monthsBack * 30 * 24 * 60 * 60 * 1000,
    );
    const randomTime =
      pastDate.getTime() + Math.random() * (now.getTime() - pastDate.getTime());
    return new Date(randomTime);
  }

  private async createOrderWithTrips(
    orderDate: Date,
    trucks: TruckDocument[],
    addresses: AddressDocument[],
  ): Promise<void> {
    // Generate realistic pallets
    const pallets = this.generateRandomPallets();
    const cargoWeight = pallets.reduce((sum, p) => sum + p.weight, 0);

    // Create order
    const orderNumber = await this.counterService.generateOrderNumber();
    const randomAddress =
      addresses[Math.floor(Math.random() * addresses.length)];

    const order = new this.orderModel({
      orderNumber,
      pallets,
      cargoWeight,
      remainingCargo: cargoWeight,
      status: this.getRandomOrderStatus(orderDate),
      destinationAddressId: randomAddress._id,
      notes: this.getRandomOrderNotes(),
      trips: [],
      createdAt: orderDate,
      updatedAt: orderDate,
    });

    const savedOrder = await order.save();

    // Create trips for this order
    await this.createTripsForOrder(savedOrder, trucks, orderDate);
  }

  private generateRandomPallets(): IPallet[] {
    const palletCount = Math.floor(Math.random() * 8) + 1; // 1-8 pallets
    const pallets: IPallet[] = [];

    for (let i = 0; i < palletCount; i++) {
      pallets.push({
        id: `PLT-${Date.now()}-${i}`,
        weight: Math.floor(Math.random() * 800) + 200, // 200-1000 kg
        height: Math.floor(Math.random() * 100) + 100, // 100-200 cm
      });
    }

    return pallets;
  }

  private getRandomOrderStatus(orderDate: Date): OrderStatus {
    // For historical data (statistics), only generate DONE or CANCELLED orders
    // 85% completed, 15% cancelled for realistic business statistics
    return Math.random() < 0.85 ? OrderStatus.DONE : OrderStatus.CANCELLED;
  }

  private getRandomOrderNotes(): string | undefined {
    const notes = [
      'Fragile items - handle with care',
      'Delivery before 5 PM',
      'Contact recipient before delivery',
      'Special handling required',
      'Temperature sensitive cargo',
      undefined, // Some orders have no notes
      undefined,
      undefined,
    ];
    return notes[Math.floor(Math.random() * notes.length)];
  }

  private async createTripsForOrder(
    order: OrderDocument,
    trucks: TruckDocument[],
    baseDate: Date,
  ): Promise<void> {
    // All historical orders should have trips (DONE or CANCELLED orders)
    // No need to check for DRAFT since we don't generate them for historical data

    // Determine number of trips based on pallets and truck capacity
    const totalPallets = order.pallets.length;
    const maxPalletsPerTrip = Math.min(...trucks.map((t) => t.maxPallets));
    const minTrips = Math.ceil(totalPallets / maxPalletsPerTrip);
    const tripCount = Math.max(1, minTrips + Math.floor(Math.random() * 2)); // Add some randomness

    let assignedPallets: string[] = [];
    const trips: Types.ObjectId[] = [];

    for (
      let i = 0;
      i < tripCount && assignedPallets.length < totalPallets;
      i++
    ) {
      const trip = await this.createTrip(
        order,
        trucks,
        baseDate,
        i,
        assignedPallets,
      );
      if (trip) {
        trips.push(trip._id as Types.ObjectId);
        assignedPallets = assignedPallets.concat(trip.palletIds);
      }
    }

    // Update order with trip references
    order.trips = trips;
    await order.save();
  }

  private async createTrip(
    order: OrderDocument,
    trucks: TruckDocument[],
    baseDate: Date,
    tripIndex: number,
    alreadyAssigned: string[],
  ): Promise<TripDocument | null> {
    const availablePallets = order.pallets
      .filter((p) => !alreadyAssigned.includes(p.id))
      .map((p) => p.id);

    if (availablePallets.length === 0) {
      return null;
    }

    // Select random truck
    const randomTruck = trucks[Math.floor(Math.random() * trucks.length)];

    // Assign pallets (respecting truck capacity)
    const palletsToAssign = availablePallets.slice(
      0,
      Math.min(availablePallets.length, randomTruck.maxPallets),
    );

    // Generate trip dates
    const startDate = new Date(
      baseDate.getTime() + tripIndex * 24 * 60 * 60 * 1000,
    ); // Space trips 1 day apart

    const tripNumber = await this.counterService.generateTripNumber();

    // Calculate realistic fuel and duration based on truck and address data
    const truckId = (randomTruck._id as Types.ObjectId).toString();
    const addressId = order.destinationAddressId.toString();

    const estimatedFuel = this.calculateEstimatedFuel(truckId, addressId);
    const estimatedDuration = this.calculateEstimatedDuration(addressId);

    const trip = new this.tripModel({
      orderId: order._id,
      truckId: randomTruck._id,
      tripNumber,
      palletIds: palletsToAssign,
      startDate,
      estimatedFuel,
      estimatedDuration,
      actualFuel: undefined,
      actualDuration: undefined,
      notes: this.getRandomTripNotes(),
      status: this.getTripStatus(order.status, startDate),
      createdAt: baseDate,
      updatedAt: baseDate,
    });

    // Add actual values for completed trips
    if (trip.status === TripStatus.DONE) {
      trip.actualFuel = this.calculateActualFuel(estimatedFuel);
      trip.actualDuration = this.calculateActualDuration(estimatedDuration);
    }

    return await trip.save();
  }

  private getTripStatus(orderStatus: OrderStatus, tripDate: Date): TripStatus {
    // For historical data (statistics), align trip status with order status
    if (orderStatus === OrderStatus.DONE) {
      return TripStatus.DONE;
    }

    if (orderStatus === OrderStatus.CANCELLED) {
      // When order is cancelled, some trips might have been completed before cancellation
      return Math.random() < 0.3 ? TripStatus.DONE : TripStatus.CANCELLED;
    }

    // Since we only generate DONE or CANCELLED orders, this should never happen
    // But keeping as fallback
    return TripStatus.DONE;
  }

  private calculateEstimatedFuel(truckId: string, addressId: string): number {
    const truckData = trucksData[truckId];
    const addressData = addressesData[addressId];

    if (!truckData || !addressData) {
      // Fallback to random if data not found
      return Math.floor(Math.random() * 100) + 50;
    }

    // Calculate fuel: consumption (l/100km) * distance (km) * 2 (round trip) / 100
    const distanceKm = addressData.range;
    const fuelConsumption = truckData.consumption;
    const estimatedFuel = Math.round((fuelConsumption * distanceKm * 2) / 100);

    return estimatedFuel;
  }

  private calculateEstimatedDuration(addressId: string): number {
    const addressData = addressesData[addressId];

    if (!addressData) {
      // Fallback to random if data not found
      return Math.floor(Math.random() * 6) + 8; // 8-14 hours
    }

    // Calculate duration: travel time * 2 + unloading time + rest time (if needed)
    const travelTimeHours = addressData.time * 2; // Round trip
    const unloadingTimeHours = Math.floor(Math.random() * 2) + 2; // 2-3 hours unloading

    let totalHours = travelTimeHours + unloadingTimeHours;

    // If driver works more than 9 hours, add mandatory 9-hour rest
    if (totalHours > 9) {
      totalHours += 9; // Mandatory rest period
    }

    return Math.round(totalHours);
  }

  private calculateActualFuel(estimatedFuel: number): number {
    // Add variance: ±10-20% of estimated fuel
    const variance = (Math.random() - 0.5) * 0.4; // -20% to +20%
    const actualFuel = estimatedFuel * (1 + variance);
    return Math.round(actualFuel);
  }

  private calculateActualDuration(estimatedDuration: number): number {
    // Add variance: ±2-3 hours
    const varianceHours = (Math.random() - 0.5) * 6; // -3 to +3 hours
    const actualDuration = estimatedDuration + varianceHours;
    return Math.round(Math.max(1, actualDuration)); // Minimum 1 hour
  }

  private getRandomTripNotes(): string | undefined {
    const notes = [
      'Standard delivery route',
      'Heavy traffic expected',
      'Early morning departure',
      'Multiple stops required',
      'Return trip scheduled',
      undefined,
      undefined,
    ];
    return notes[Math.floor(Math.random() * notes.length)];
  }

  async clearSeedData(): Promise<void> {
    console.log('Clearing existing seed data...');

    // Get all orders created in the last 3 months for safety
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const orders = await this.orderModel
      .find({
        createdAt: { $gte: threeMonthsAgo },
      })
      .exec();

    // Delete trips associated with these orders
    const orderIds = orders.map((order) => order._id);
    await this.tripModel.deleteMany({ orderId: { $in: orderIds } }).exec();

    // Delete the orders
    await this.orderModel.deleteMany({ _id: { $in: orderIds } }).exec();

    console.log(`Cleared ${orders.length} orders and their associated trips`);
  }
}
