import { IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CompleteTripDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  actualFuel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  actualDuration?: number;
}
