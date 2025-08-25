import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TripStatus } from '../models/trip';

export type TripDocument = Trip & Document;

@Schema({ timestamps: true })
export class Trip {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Truck', required: true })
  truckId: Types.ObjectId;

  @Prop({ required: true })
  cargoSize: number;

  @Prop({ 
    type: String, 
    enum: Object.values(TripStatus), 
    default: TripStatus.NEW 
  })
  status: TripStatus;

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  plannedFuel: number;

  @Prop()
  actualEndTime?: Date;

  @Prop()
  actualFuel?: number;

  @Prop()
  actualTimeSpent?: number;

  @Prop()
  notes?: string;
}

export const TripSchema = SchemaFactory.createForClass(Trip);