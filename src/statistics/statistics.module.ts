import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { Order, OrderSchema } from '../schemas/order.schema';
import { Trip, TripSchema } from '../schemas/trip.schema';
import { Truck, TruckSchema } from '../schemas/truck.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Trip.name, schema: TripSchema },
      { name: Truck.name, schema: TruckSchema },
    ]),
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}