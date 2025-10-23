import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { SmartTripController } from './smart-trip.controller';
import { SmartOrderService } from '../services/smart-order.service';
import { TripOptimizerService } from '../services/trip-optimizer.service';
import { HistoricalContextService } from '../services/historical-context.service';
import { EnhancedCalculatorService } from '../services/enhanced-calculator.service';
import { Truck, TruckSchema } from '../schemas/truck.schema';
import { Order, OrderSchema } from '../schemas/order.schema';
import { Trip, TripSchema } from '../schemas/trip.schema';
import { Address, AddressSchema } from '../schemas/address.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Truck.name, schema: TruckSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Trip.name, schema: TripSchema },
      { name: Address.name, schema: AddressSchema },
    ]),
  ],
  controllers: [SmartTripController],
  providers: [
    SmartOrderService,
    TripOptimizerService,
    HistoricalContextService,
    EnhancedCalculatorService,
  ],
  exports: [
    SmartOrderService,
    TripOptimizerService,
    HistoricalContextService,
    EnhancedCalculatorService,
  ],
})
export class SmartTripModule {}
