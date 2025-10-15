import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TripStatus } from '../models/trip';

export type TripDocument = Trip & Document;

@Schema({ timestamps: true })
export class Trip {
  @Prop({ required: true, unique: true })
  tripNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Truck', required: true })
  truckId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  palletIds: string[];

  @Prop({
    type: String,
    enum: Object.values(TripStatus),
    default: TripStatus.PLANNED,
  })
  status: TripStatus;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  estimatedFuel: number;

  @Prop({ required: true })
  estimatedDuration: number;

  @Prop()
  actualFuel?: number;

  @Prop()
  actualDuration?: number;

  @Prop()
  notes?: string;
}

export const TripSchema = SchemaFactory.createForClass(Trip);
