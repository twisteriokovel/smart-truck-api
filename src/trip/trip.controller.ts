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
import { TripService } from './trip.service';
import {
  ITripResponse,
  ITripDto,
  IUpdateTripDto,
  IFinishTripDto,
  ITripsListResponse,
} from '../models/trip';

@Controller('trips')
@UseGuards(AuthGuard('jwt'))
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Post()
  async create(@Body() createTripDto: ITripDto): Promise<ITripResponse> {
    return this.tripService.create(createTripDto);
  }

  @Get()
  async findAll(): Promise<ITripsListResponse> {
    return this.tripService.findAll();
  }

  @Get('order/:orderId')
  async findByOrder(
    @Param('orderId') orderId: string,
  ): Promise<ITripsListResponse> {
    return this.tripService.findByOrder(orderId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ITripResponse> {
    return this.tripService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTripDto: IUpdateTripDto,
  ): Promise<ITripResponse> {
    return this.tripService.update(id, updateTripDto);
  }

  @Patch(':id/start')
  async start(@Param('id') id: string): Promise<ITripResponse> {
    return this.tripService.start(id);
  }

  @Patch(':id/finish')
  async finish(
    @Param('id') id: string,
    @Body() finishTripDto: IFinishTripDto,
  ): Promise<ITripResponse> {
    return this.tripService.finish(id, finishTripDto);
  }

  @Patch(':id/cancel')
  async cancel(@Param('id') id: string): Promise<ITripResponse> {
    return this.tripService.cancel(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.tripService.remove(id);
    return { message: 'Trip deleted successfully' };
  }
}
