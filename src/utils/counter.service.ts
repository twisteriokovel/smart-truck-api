import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Counter, CounterDocument } from '../schemas/counter.schema';

@Injectable()
export class CounterService {
  constructor(
    @InjectModel(Counter.name) private counterModel: Model<CounterDocument>,
  ) {}

  async getNextSequence(name: string): Promise<number> {
    const counter = await this.counterModel
      .findOneAndUpdate(
        { name },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true },
      )
      .exec();

    return counter.sequence;
  }

  async generateOrderNumber(): Promise<string> {
    const sequence = await this.getNextSequence('orders');
    return `ORD-${sequence.toString().padStart(5, '0')}`;
  }

  async generateTripNumber(): Promise<string> {
    const sequence = await this.getNextSequence('trips');
    return `TRP-${sequence.toString().padStart(5, '0')}`;
  }
}
