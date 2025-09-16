import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Query,
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
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ITrucksListResponse> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
    return this.truckService.findAll(pageNum, pageSizeNum);
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

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTruckDto: ICreateTruckDto,
  ): Promise<ITruckResponse> {
    return this.truckService.update(id, updateTruckDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.truckService.remove(id);
    return { message: 'Truck deleted successfully' };
  }
}
