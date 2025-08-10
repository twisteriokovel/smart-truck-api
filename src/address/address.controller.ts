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
  findAllAddresses() {
    return this.addressService.findAllAddresses();
  }

  @Get(':id')
  findOneAddress(@Param('id') id: string) {
    return this.addressService.findOneAddress(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAddressDto: IAddressResponse) {
    return this.addressService.update(id, updateAddressDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.addressService.remove(id);
  }
}
