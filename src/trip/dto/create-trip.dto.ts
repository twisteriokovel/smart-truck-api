import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTripDto {
  @IsNotEmpty()
  @IsString()
  truckId: string;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  palletIds?: string[];

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  estimatedFuel: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  estimatedDuration: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
