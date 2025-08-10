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
import { TruckService } from './truck.service';
import {
  ITruckResponse,
  ICreateTruckDto,
  IUpdateTruckDto,
  ITrucksListResponse,
} from '../models/truck';

@Controller('trucks')
@UseGuards(AuthGuard('jwt'))
export class TruckController {
  constructor(private readonly truckService: TruckService) {}

  @Post()
  async create(
    @Body() createTruckDto: ICreateTruckDto,
  ): Promise<ITruckResponse> {
    return this.truckService.create(createTruckDto);
  }

  @Get()
  async findAll(): Promise<ITrucksListResponse> {
    return this.truckService.findAll();
  }

  @Get('plate/:plateNumber')
  async findByPlateNumber(
    @Param('plateNumber') plateNumber: string,
  ): Promise<ITruckResponse> {
    return this.truckService.findByPlateNumber(plateNumber);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ITruckResponse> {
    return this.truckService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTruckDto: IUpdateTruckDto,
  ): Promise<ITruckResponse> {
    return this.truckService.update(id, updateTruckDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.truckService.remove(id);
    return { message: 'Truck deleted successfully' };
  }
}
