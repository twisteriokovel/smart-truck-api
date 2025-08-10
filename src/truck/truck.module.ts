import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TruckService } from './truck.service';
import { TruckController } from './truck.controller';
import { Truck, TruckSchema } from '../schemas/truck.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Truck.name, schema: TruckSchema }]),
  ],
  controllers: [TruckController],
  providers: [TruckService],
  exports: [TruckService],
})
export class TruckModule {}
