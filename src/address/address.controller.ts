import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { IAddressDto, IAddressResponse } from '../models/address';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createAddressDto: IAddressDto,
  ) {
    return this.addressService.create(createAddressDto);
  }

  @Get()
  findAllAddresses(@Request() req: AuthenticatedRequest) {
    return this.addressService.findAllAddresses();
  }

  @Get(':id')
  findOneAddress(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.addressService.findOneAddress(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() updateAddressDto: IAddressResponse,
  ) {
    return this.addressService.update(id, updateAddressDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.addressService.remove(id);
  }
}
