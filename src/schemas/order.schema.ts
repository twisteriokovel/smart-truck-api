import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OrderStatus, IPallet } from '../models/order';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, type: [{
    id: { type: String, required: true },
    weight: { type: Number, required: true },
    height: { type: Number, required: true }
  }] })
  pallets: IPallet[];

  @Prop({ required: true })
  cargoWeight: number;

  @Prop({ required: true })
  remainingCargo: number;

  @Prop({
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.DRAFT,
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
