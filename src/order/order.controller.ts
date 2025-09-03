import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrderService } from './order.service';
import {
  IOrderResponse,
  IOrderDto,
  IUpdateOrderDto,
  IOrdersListResponse,
} from '../models/order';

@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async create(@Body() createOrderDto: IOrderDto): Promise<IOrderResponse> {
    return this.orderService.create(createOrderDto);
  }

  @Get()
  async findAll(): Promise<IOrdersListResponse> {
    return this.orderService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<IOrderResponse> {
    return this.orderService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateOrderDto: IUpdateOrderDto,
  ): Promise<IOrderResponse> {
    return this.orderService.update(id, updateOrderDto);
  }

  @Patch(':id/cancel')
  async cancel(@Param('id') id: string): Promise<IOrderResponse> {
    return this.orderService.cancel(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.orderService.remove(id);
    return { message: 'Order deleted successfully' };
  }
}
