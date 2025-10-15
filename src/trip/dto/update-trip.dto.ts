import {
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTripDto {
  @IsOptional()
  @IsString()
  truckId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  palletIds?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  estimatedFuel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  estimatedDuration?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
