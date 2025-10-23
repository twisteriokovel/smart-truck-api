import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
  Get,
  Query,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SmartOrderService } from '../services/smart-order.service';
import { HistoricalContextService } from '../services/historical-context.service';
import {
  ISmartOptimizationRequest,
  ISmartOptimizationResponse,
} from '../models/smart-trip';
import {
  SmartOptimizationRequestDto,
  SmartOptimizationResponseDto,
  PerformanceTrendsDto,
} from './dto/smart-trip.dto';
import { IPallet } from 'src/models/order';

@ApiTags('smart-trip')
@Controller('api/smart-trip')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SmartTripController {
  private readonly logger = new Logger(SmartTripController.name);

  constructor(
    private readonly smartOrderService: SmartOrderService,
    private readonly historicalContextService: HistoricalContextService,
  ) {}

  @Post('optimize')
  @ApiOperation({
    summary: 'Create optimized trips with LLM analysis',
    description:
      'Automatically generates optimal trip assignments using bin-packing algorithm and enhances them with Cla ude AI analysis for reasoning, risks, and alternatives.',
  })
  @ApiResponse({
    status: 200,
    description: 'Smart optimization completed successfully',
    type: SmartOptimizationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 500,
    description: 'Optimization failed',
  })
  async optimizeOrder(
    @Body() request: SmartOptimizationRequestDto,
  ): Promise<ISmartOptimizationResponse> {
    try {
      this.logger.log(
        `Smart optimization requested for order: ${request.orderId}`,
      );

      // Validate request
      if (!request.pallets || request.pallets.length === 0) {
        throw new HttpException(
          'At least one pallet is required for optimization',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!request.orderId || request.orderId.trim().length === 0) {
        throw new HttpException('Order ID is required', HttpStatus.BAD_REQUEST);
      }

      // Validate pallets
      for (const pallet of request.pallets) {
        if (!pallet.id || !pallet.weight || !pallet.height) {
          throw new HttpException(
            'Each pallet must have id, weight, and height properties',
            HttpStatus.BAD_REQUEST,
          );
        }

        if (pallet.weight <= 0 || pallet.height <= 0) {
          throw new HttpException(
            'Pallet weight and height must be positive numbers',
            HttpStatus.BAD_REQUEST,
          );
        }

        if (pallet.weight > 50000) {
          // 50 tons max
          throw new HttpException(
            `Pallet ${pallet.id} exceeds maximum weight limit of 50,000kg`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Convert DTO to service interface
      const optimizationRequest: ISmartOptimizationRequest = {
        pallets: request.pallets,
        orderId: request.orderId,
        includeHistoricalContext: request.includeHistoricalContext ?? true,
        preferredTrucks: request.preferredTrucks,
      };

      // Execute optimization
      const result =
        await this.smartOrderService.createSmartOptimization(
          optimizationRequest,
        );

      if (!result.success) {
        throw new HttpException(
          result.error || 'Optimization failed',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      this.logger.log(
        `Smart optimization completed for order: ${request.orderId} in ${result.processingTime}ms`,
      );

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Smart optimization failed for order: ${request.orderId}`,
        error,
      );

      throw new HttpException(
        'Internal server error during optimization',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('performance-trends')
  @ApiOperation({
    summary: 'Get historical performance trends',
    description:
      'Retrieves performance metrics and trends for the logistics operations over a specified period.',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance trends retrieved successfully',
    type: PerformanceTrendsDto,
  })
  async getPerformanceTrends(
    @Query('days') days?: string,
  ): Promise<PerformanceTrendsDto> {
    try {
      const daysNumber = days ? parseInt(days, 10) : 30;

      if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
        throw new HttpException(
          'Days parameter must be a number between 1 and 365',
          HttpStatus.BAD_REQUEST,
        );
      }

      const trends =
        await this.historicalContextService.getPerformanceTrends(daysNumber);

      return {
        period: daysNumber,
        ...trends,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Failed to get performance trends:', error);

      throw new HttpException(
        'Failed to retrieve performance trends',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('validate-pallets')
  @ApiOperation({
    summary: 'Validate pallet data for optimization',
    description:
      'Validates pallet data and provides optimization feasibility assessment without running full optimization.',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation completed',
  })
  async validatePallets(@Body() request: { pallets: IPallet[] }): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    totalWeight: number;
    totalPallets: number;
    estimatedTrips: number;
  }> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!request.pallets || !Array.isArray(request.pallets)) {
        errors.push('Pallets must be an array');
        return {
          valid: false,
          errors,
          warnings,
          totalWeight: 0,
          totalPallets: 0,
          estimatedTrips: 0,
        };
      }

      if (request.pallets.length === 0) {
        errors.push('At least one pallet is required');
      }

      let totalWeight = 0;
      const palletIds = new Set();

      for (const [index, pallet] of request.pallets.entries()) {
        const palletPrefix = `Pallet ${index + 1}`;

        if (!pallet.id) {
          errors.push(`${palletPrefix}: ID is required`);
        } else if (palletIds.has(pallet.id)) {
          errors.push(`${palletPrefix}: Duplicate ID '${pallet.id}'`);
        } else {
          palletIds.add(pallet.id);
        }

        if (typeof pallet.weight !== 'number' || pallet.weight <= 0) {
          errors.push(`${palletPrefix}: Weight must be a positive number`);
        } else {
          totalWeight += pallet.weight;

          if (pallet.weight > 50000) {
            errors.push(`${palletPrefix}: Weight exceeds 50,000kg limit`);
          } else if (pallet.weight < 50) {
            warnings.push(
              `${palletPrefix}: Very light weight (${pallet.weight}kg)`,
            );
          } else if (pallet.weight > 5000) {
            warnings.push(
              `${palletPrefix}: Very heavy weight (${pallet.weight}kg)`,
            );
          }
        }

        if (typeof pallet.height !== 'number' || pallet.height <= 0) {
          errors.push(`${palletPrefix}: Height must be a positive number`);
        } else if (pallet.height > 3) {
          warnings.push(
            `${palletPrefix}: Very tall pallet (${pallet.height}m)`,
          );
        }
      }

      // Estimate trips needed (rough calculation)
      const averageTruckCapacity = 20000; // 20 tons average
      const estimatedTrips = Math.ceil(totalWeight / averageTruckCapacity);

      if (estimatedTrips > 10) {
        warnings.push(
          `Large order may require ${estimatedTrips} trips - consider splitting`,
        );
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        totalWeight,
        totalPallets: request.pallets.length,
        estimatedTrips,
      };
    } catch (error) {
      this.logger.error('Pallet validation failed:', error);
      throw new HttpException(
        'Validation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
