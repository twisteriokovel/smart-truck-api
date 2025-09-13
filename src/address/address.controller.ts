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
import { AddressService } from './address.service';
import { IAddressDto, IAddressResponse } from '../models/address';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  create(@Body() createAddressDto: IAddressDto) {
    return this.addressService.create(createAddressDto);
  }

  @Get()
  findAllAddresses(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
    return this.addressService.findAllAddresses(pageNum, pageSizeNum);
  }

  @Get(':id')
  findOneAddress(@Param('id') id: string) {
    return this.addressService.findOneAddress(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateAddressDto: IAddressDto) {
    return this.addressService.update(id, updateAddressDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.addressService.remove(id);
  }
}
