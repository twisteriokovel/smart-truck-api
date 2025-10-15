import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order, OrderSchema } from '../schemas/order.schema';
import { Trip, TripSchema } from '../schemas/trip.schema';
import { Address, AddressSchema } from '../schemas/address.schema';
import { Counter, CounterSchema } from '../schemas/counter.schema';
import { CounterService } from '../utils/counter.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Trip.name, schema: TripSchema },
      { name: Address.name, schema: AddressSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService, CounterService],
  exports: [OrderService, CounterService],
})
export class OrderModule {}
