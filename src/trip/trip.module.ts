import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TripService } from './trip.service';
import { TripController } from './trip.controller';
import { Trip, TripSchema } from '../schemas/trip.schema';
import { Order, OrderSchema } from '../schemas/order.schema';
import { Truck, TruckSchema } from '../schemas/truck.schema';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Trip.name, schema: TripSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Truck.name, schema: TruckSchema },
    ]),
    forwardRef(() => OrderModule),
  ],
  controllers: [TripController],
  providers: [TripService],
  exports: [TripService],
})
export class TripModule {}
