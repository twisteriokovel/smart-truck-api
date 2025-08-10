import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EURO_PALLET } from '../models/truck';

export type TruckDocument = Truck & Document;

@Schema({ timestamps: true })
export class Truck {
  @Prop({ required: true, unique: true })
  plateNumber: string;

  @Prop({ required: true, unique: true })
  vinCode: string;

  @Prop({ required: true })
  registrationCertificate: string;

  @Prop({ required: true })
  driverName: string;

  @Prop({ required: true })
  width: number;

  @Prop({ required: true })
  height: number;

  @Prop({ required: true })
  length: number;

  @Prop({ required: true })
  maxWeight: number;

  @Prop()
  truckModel?: string;

  @Prop()
  manufacturingYear?: number;

  @Prop()
  notes?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  maxPallets: number;
}

export const TruckSchema = SchemaFactory.createForClass(Truck);
