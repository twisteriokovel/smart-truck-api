import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AddressModule } from './address/address.module';
import { TruckModule } from './truck/truck.module';
import { OrderModule } from './order/order.module';
import { TripModule } from './trip/trip.module';
import { StatisticsModule } from './statistics/statistics.module';
import { SeedDataService } from './utils/seed-data.service';
import { CounterService } from './utils/counter.service';
import { Order, OrderSchema } from './schemas/order.schema';
import { Trip, TripSchema } from './schemas/trip.schema';
import { Truck, TruckSchema } from './schemas/truck.schema';
import { Address, AddressSchema } from './schemas/address.schema';
import { Counter, CounterSchema } from './schemas/counter.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI!),
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Trip.name, schema: TripSchema },
      { name: Truck.name, schema: TruckSchema },
      { name: Address.name, schema: AddressSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    AuthModule,
    AddressModule,
    TruckModule,
    OrderModule,
    TripModule,
    StatisticsModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedDataService, CounterService],
})
export class AppModule {}
