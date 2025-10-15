import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ValidationPipe,
  Query,
  Put,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TripService } from './trip.service';
import { ITripResponse, ITripsListResponse } from '../models/trip';
import { CreateTripDto, UpdateTripDto, CompleteTripDto } from './dto';
import { IAvailableTruck } from './interfaces/truck-availability.interface';

@Controller(['orders', 'trips'])
@UseGuards(AuthGuard('jwt'))
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Get(':orderId/trips')
  async getTripsByOrder(
    @Param('orderId') orderId: string,
  ): Promise<ITripResponse[]> {
    return this.tripService.findTripsByOrder(orderId);
  }

  @Post(':orderId/trips')
  async createTripForOrder(
    @Param('orderId') orderId: string,
    @Body(new ValidationPipe({ transform: true })) createTripDto: CreateTripDto,
  ): Promise<ITripResponse> {
    return this.tripService.createTripForOrder(orderId, createTripDto);
  }

  @Get(':orderId/available-trucks')
  async getAvailableTrucksForOrder(
    @Param('orderId') orderId: string,
  ): Promise<IAvailableTruck[]> {
    return this.tripService.getAvailableTrucksForOrder(orderId);
  }

  @Get()
  async getAllTrips(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ITripsListResponse> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
    return this.tripService.findAllTrips(pageNum, pageSizeNum);
  }

  @Get(':tripId')
  async getTrip(@Param('tripId') tripId: string): Promise<ITripResponse> {
    return this.tripService.findTripById(tripId);
  }

  @Put(':tripId')
  async updateTrip(
    @Param('tripId') tripId: string,
    @Body(new ValidationPipe({ transform: true })) updateTripDto: UpdateTripDto,
  ): Promise<ITripResponse> {
    return this.tripService.updateTripById(tripId, updateTripDto);
  }

  @Delete(':tripId')
  async deleteTrip(
    @Param('tripId') tripId: string,
  ): Promise<{ message: string }> {
    await this.tripService.deleteTripById(tripId);
    return { message: 'Trip deleted successfully' };
  }

  @Patch(':tripId/start')
  async startTrip(@Param('tripId') tripId: string): Promise<ITripResponse> {
    return this.tripService.startTripById(tripId);
  }

  @Patch(':tripId/complete')
  async completeTrip(
    @Param('tripId') tripId: string,
    @Body(new ValidationPipe({ transform: true }))
    completeTripDto: CompleteTripDto,
  ): Promise<ITripResponse> {
    return this.tripService.completeTripById(tripId, completeTripDto);
  }
}
