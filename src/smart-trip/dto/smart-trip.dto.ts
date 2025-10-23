import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IPallet } from '../../models/order';

export class PalletDto implements IPallet {
  @ApiProperty({
    description: 'Unique identifier for the pallet',
    example: 'pallet-001',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Weight of the pallet in kilograms',
    example: 1500,
    minimum: 0.1,
    maximum: 50000,
  })
  @IsNumber()
  weight: number;

  @ApiProperty({
    description: 'Height of the pallet in meters',
    example: 1.8,
    minimum: 0.1,
    maximum: 5,
  })
  @IsNumber()
  height: number;
}

export class SmartOptimizationRequestDto {
  @ApiProperty({
    description: 'Array of pallets to be optimized',
    type: [PalletDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PalletDto)
  pallets: PalletDto[];

  @ApiProperty({
    description: 'Unique identifier for the order',
    example: 'order-12345',
  })
  @IsString()
  orderId: string;

  @ApiProperty({
    description: 'Whether to include historical context in optimization',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includeHistoricalContext?: boolean;

  @ApiProperty({
    description: 'Array of preferred truck IDs to prioritize',
    example: ['truck-001', 'truck-002'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredTrucks?: string[];
}

export class LLMAnalysisDto {
  @ApiProperty({
    description: 'Reasoning behind the trip assignment',
    example:
      'This truck assignment optimizes weight distribution and minimizes fuel consumption',
  })
  reasoning: string;

  @ApiProperty({
    description: 'Potential risks and issues identified',
    example: [
      'Weather conditions may cause delays',
      'Driver availability needs confirmation',
    ],
    type: [String],
  })
  risks: string[];

  @ApiProperty({
    description: 'Alternative approaches if the primary plan fails',
    example: [
      'Use smaller truck with multiple trips',
      'Reschedule to avoid peak traffic',
    ],
    type: [String],
  })
  alternatives: string[];

  @ApiProperty({
    description: 'Confidence score from 0 to 100',
    example: 85,
    minimum: 0,
    maximum: 100,
  })
  confidence: number;
}

export class RouteInfoDto {
  @ApiProperty({
    description: 'Starting point of the route',
    example: 'Warehouse A',
  })
  startPoint: string;

  @ApiProperty({
    description: 'Destination point of the route',
    example: 'Customer Location',
  })
  endPoint: string;

  @ApiProperty({
    description: 'Estimated distance in kilometers',
    example: 45.5,
  })
  estimatedDistance: number;

  @ApiProperty({
    description: 'Estimated travel time in hours',
    example: 2.5,
  })
  estimatedTime: number;
}

export class TruckInfoDto {
  @ApiProperty({
    description: 'Truck unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Truck plate number',
    example: 'ABC-123',
  })
  plateNumber: string;

  @ApiProperty({
    description: 'Driver name',
    example: 'John Smith',
  })
  driverName: string;

  @ApiProperty({
    description: 'Maximum weight capacity in kilograms',
    example: 20000,
  })
  maxWeight: number;

  @ApiProperty({
    description: 'Maximum number of pallets',
    example: 33,
  })
  maxPallets: number;
}

export class SmartTripDto {
  @ApiProperty({
    description: 'Truck ID assigned to this trip',
    example: '507f1f77bcf86cd799439011',
  })
  truckId: string;

  @ApiProperty({
    description: 'Detailed truck information',
    type: TruckInfoDto,
  })
  truck: TruckInfoDto;

  @ApiProperty({
    description: 'Array of pallet IDs assigned to this trip',
    example: ['pallet-001', 'pallet-002'],
    type: [String],
  })
  palletIds: string[];

  @ApiProperty({
    description: 'Total estimated weight for this trip in kilograms',
    example: 15500,
  })
  estimatedWeight: number;

  @ApiProperty({
    description: 'Number of pallets in this trip',
    example: 12,
  })
  estimatedPalletCount: number;

  @ApiProperty({
    description: 'Estimated fuel consumption in liters',
    example: 45.5,
  })
  estimatedFuel: number;

  @ApiProperty({
    description: 'Estimated trip duration in hours',
    example: 6.5,
  })
  estimatedDuration: number;

  @ApiProperty({
    description: 'Load efficiency percentage (0-100)',
    example: 87.5,
  })
  efficiency: number;

  @ApiProperty({
    description: 'Route information',
    type: RouteInfoDto,
    required: false,
  })
  route?: RouteInfoDto;

  @ApiProperty({
    description: 'LLM analysis and insights',
    type: LLMAnalysisDto,
  })
  llmAnalysis: LLMAnalysisDto;
}

export class OptimizationSummaryDto {
  @ApiProperty({
    description: 'Total number of trips generated',
    example: 3,
  })
  totalTrips: number;

  @ApiProperty({
    description: 'Average efficiency across all trips',
    example: 82.5,
  })
  averageEfficiency: number;

  @ApiProperty({
    description: 'Total estimated fuel consumption in liters',
    example: 135.5,
  })
  totalEstimatedFuel: number;

  @ApiProperty({
    description: 'Total estimated duration in hours',
    example: 18.5,
  })
  totalEstimatedDuration: number;
}

export class OverallAnalysisDto {
  @ApiProperty({
    description: 'Overall optimization strategy summary',
    example: 'Bin-packing optimization with efficiency prioritization',
  })
  overallStrategy: string;

  @ApiProperty({
    description: 'Suggestions for potential improvements',
    example: ['Consider route optimization', 'Review truck scheduling'],
    type: [String],
  })
  potentialImprovements: string[];

  @ApiProperty({
    description: 'Overall risk assessment',
    example: 'Low risk - well-optimized plan with good efficiency',
  })
  riskAssessment: string;
}

export class SmartOptimizationResultDto {
  @ApiProperty({
    description: 'Order ID that was optimized',
    example: 'order-12345',
  })
  orderId: string;

  @ApiProperty({
    description: 'Array of optimized trips with LLM analysis',
    type: [SmartTripDto],
  })
  trips: SmartTripDto[];

  @ApiProperty({
    description: 'Total number of pallets in the order',
    example: 25,
  })
  totalPallets: number;

  @ApiProperty({
    description: 'Total weight of all pallets in kilograms',
    example: 45000,
  })
  totalWeight: number;

  @ApiProperty({
    description: 'Summary of optimization metrics',
    type: OptimizationSummaryDto,
  })
  optimizationSummary: OptimizationSummaryDto;

  @ApiProperty({
    description: 'Overall LLM analysis of the optimization plan',
    type: OverallAnalysisDto,
    required: false,
  })
  llmOverallAnalysis?: OverallAnalysisDto;
}

export class SmartOptimizationResponseDto {
  @ApiProperty({
    description: 'Whether the optimization was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Optimization result data',
    type: SmartOptimizationResultDto,
    required: false,
  })
  data?: SmartOptimizationResultDto;

  @ApiProperty({
    description: 'Error message if optimization failed',
    example: 'No available trucks found',
    required: false,
  })
  error?: string;

  @ApiProperty({
    description: 'Processing time in milliseconds',
    example: 1250,
  })
  processingTime: number;
}

export class PerformanceTrendsDto {
  @ApiProperty({
    description: 'Period in days for the trends',
    example: 30,
  })
  period: number;

  @ApiProperty({
    description: 'Total number of completed orders',
    example: 145,
  })
  totalOrders: number;

  @ApiProperty({
    description: 'Total number of completed trips',
    example: 287,
  })
  totalTrips: number;

  @ApiProperty({
    description: 'Average trips per order',
    example: 1.98,
  })
  averageTripsPerOrder: number;

  @ApiProperty({
    description: 'Average fuel efficiency in liters per trip',
    example: 35.5,
  })
  fuelEfficiencyTrend: number;

  @ApiProperty({
    description: 'Average load utilization percentage',
    example: 78.2,
  })
  utilizationTrend: number;
}
