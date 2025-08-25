import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OrderStatus } from '../models/order';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true })
  cargoSize: number;

  @Prop({ required: true, default: function() { return this.cargoSize; } })
  remainingCargo: number;

  @Prop({ 
    type: String, 
    enum: Object.values(OrderStatus), 
    default: OrderStatus.DRAFT 
  })
  status: OrderStatus;

  @Prop({ type: Types.ObjectId, ref: 'Address', required: true })
  destinationAddressId: Types.ObjectId;

  @Prop()
  notes?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Trip' }], default: [] })
  trips: Types.ObjectId[];
}

export const OrderSchema = SchemaFactory.createForClass(Order);