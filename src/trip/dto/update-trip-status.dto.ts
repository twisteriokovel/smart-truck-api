import { IsNotEmpty, IsEnum } from 'class-validator';
import { TripStatus } from '../../models/trip';

export class UpdateTripStatusDto {
  @IsNotEmpty()
  @IsEnum(TripStatus)
  status: TripStatus;
}
