import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Address } from '../schemas/address.schema';
import { ITripTruckInfo } from '../models/trip';
import { trucksData, ITruckData } from '../constants/trucks-data';
import { addressesData, IAddressData } from '../constants/addresses-data';

@Injectable()
export class EnhancedCalculatorService {
  private readonly logger = new Logger(EnhancedCalculatorService.name);

  constructor(
    @InjectModel(Address.name) private addressModel: Model<Address>,
  ) {}

  /**
   * Calculate realistic estimated fuel consumption for a trip
   */
  async calculateEstimatedFuel(
    truck: ITripTruckInfo,
    destinationAddressId?: string,
    weight?: number,
  ): Promise<number> {
    try {
      const truckSpec = trucksData[truck._id];
      let addressSpec: IAddressData | undefined;

      // Try to get address data
      if (destinationAddressId) {
        addressSpec = addressesData[destinationAddressId];

        // If not in our static data, try to fetch from database
        if (!addressSpec) {
          const address = await this.addressModel
            .findById(destinationAddressId)
            .lean();
          if (address) {
            // Use a default distance calculation if not in our static data
            addressSpec = {
              city: address.city || 'Unknown',
              range: 250, // Default distance from Kyiv
              time: 4, // Default time from Kyiv
            };
          }
        }
      }

      // Calculate fuel consumption
      const oneWayDistanceKm = addressSpec?.range || 250; // Default 250km from Kyiv
      const roundTripDistanceKm = oneWayDistanceKm * 2; // Round trip
      const baseConsumption = truckSpec?.consumption || 25; // Default consumption

      // Calculate round trip fuel
      let totalFuel = (baseConsumption * roundTripDistanceKm) / 100;

      // Add weight penalty for heavier loads
      if (weight && weight > 0) {
        const weightPenaltyPercent = Math.min(weight / 5000, 0.3); // Max 30% penalty for very heavy loads
        totalFuel *= (1 + weightPenaltyPercent);
      }

      // Add 10% safety margin
      totalFuel *= 1.1;

      const result = Math.round(totalFuel);

      this.logger.debug(
        `Fuel calculation: Truck=${truckSpec?.model || 'Unknown'}, ` +
        `OneWayDistance=${oneWayDistanceKm}km, RoundTrip=${roundTripDistanceKm}km, ` +
        `Consumption=${baseConsumption}L/100km, Weight=${weight || 0}kg, Result=${result}L`
      );

      return result;
    } catch (error) {
      this.logger.warn('Fuel calculation failed, using fallback:', error);
      return this.calculateFallbackFuel(weight);
    }
  }

  /**
   * Calculate realistic estimated duration for a trip with proper driver rest
   */
  async calculateEstimatedDuration(
    truck: ITripTruckInfo,
    destinationAddressId?: string,
    palletCount?: number,
  ): Promise<number> {
    try {
      const truckSpec = trucksData[truck._id];
      let addressSpec: IAddressData | undefined;

      // Try to get address data
      if (destinationAddressId) {
        addressSpec = addressesData[destinationAddressId];

        // If not in our static data, try to fetch from database
        if (!addressSpec) {
          const address = await this.addressModel
            .findById(destinationAddressId)
            .lean();
          if (address) {
            addressSpec = {
              city: address.city || 'Unknown',
              range: 250,
              time: 4,
            };
          }
        }
      }

      // Calculate duration components
      const oneWayTravelTime = addressSpec?.time || 4; // Default 4 hours from Kyiv
      const roundTripTravelTime = oneWayTravelTime * 2; // Round trip travel time

      // Loading/unloading time based on pallet count
      const loadingTimeAtHub = (palletCount || 1) * 0.25; // 15 minutes per pallet at hub
      const unloadingTimeAtDestination = Math.max(1, (palletCount || 1) * 0.25); // Minimum 1 hour at destination

      let totalWorkingHours = roundTripTravelTime + loadingTimeAtHub + unloadingTimeAtDestination;

      // Apply EU driver regulations: mandatory rest after every 9 hours of work
      let totalHoursWithRest = totalWorkingHours;
      if (totalWorkingHours > 9) {
        // Calculate how many 9-hour blocks we have
        const fullBlocks = Math.floor(totalWorkingHours / 9);
        // Add 9 hours of rest for each complete 9-hour block
        totalHoursWithRest += fullBlocks * 9;
      }

      // Add buffer time (5-15% for unexpected delays)
      const bufferTime = totalHoursWithRest * (0.05 + Math.random() * 0.1);
      totalHoursWithRest += bufferTime;

      const result = Math.round(totalHoursWithRest);

      this.logger.debug(
        `Duration calculation: Truck=${truckSpec?.model || 'Unknown'}, ` +
        `OneWayTravel=${oneWayTravelTime}h, RoundTripTravel=${roundTripTravelTime}h, ` +
        `LoadingTime=${loadingTimeAtHub + unloadingTimeAtDestination}h, ` +
        `WorkingHours=${totalWorkingHours}h, WithRest=${totalHoursWithRest}h, ` +
        `Pallets=${palletCount || 0}, Result=${result}h`
      );

      return result;
    } catch (error) {
      this.logger.warn('Duration calculation failed, using fallback:', error);
      return this.calculateFallbackDuration(palletCount);
    }
  }

  /**
   * Get truck specifications for analysis
   */
  getTruckSpecs(truckId: string): ITruckData | undefined {
    return trucksData[truckId];
  }

  /**
   * Get address specifications for analysis
   */
  async getAddressSpecs(addressId: string): Promise<IAddressData | undefined> {
    // Try static data first
    let addressSpec = addressesData[addressId];

    if (!addressSpec) {
      // Try database
      const address = await this.addressModel.findById(addressId).lean();
      if (address) {
        addressSpec = {
          city: address.city || 'Unknown',
          range: 250,
          time: 4,
        };
      }
    }

    return addressSpec;
  }

  /**
   * Fallback fuel calculation when data is missing
   */
  private calculateFallbackFuel(weight?: number): number {
    const baseFuel = 50; // 50L base
    const weightPenalty = weight ? (weight / 1000) * 5 : 0; // 5L per ton
    return Math.round(baseFuel + weightPenalty);
  }

  /**
   * Fallback duration calculation when data is missing
   */
  private calculateFallbackDuration(palletCount?: number): number {
    const baseDuration = 8; // 8 hours base
    const loadingTime = (palletCount || 1) * 0.25;
    return Math.round(baseDuration + loadingTime);
  }

  /**
   * Calculate efficiency metrics for LLM analysis
   */
  calculateEfficiencyMetrics(
    truck: ITripTruckInfo,
    estimatedWeight: number,
    estimatedFuel: number,
    oneWayDistance?: number,
  ): {
    weightUtilization: number;
    fuelEfficiency: number;
    costEfficiency: number;
  } {
    const truckSpec = trucksData[truck._id];
    const actualOneWayDistance = oneWayDistance || 250;
    const roundTripDistance = actualOneWayDistance * 2;

    // Weight utilization (percentage of max capacity used)
    const weightUtilization = (estimatedWeight / truck.maxWeight) * 100;

    // Fuel efficiency (L/100km actual vs expected)
    const expectedConsumption = truckSpec?.consumption || 25;
    const actualConsumption = (estimatedFuel / roundTripDistance) * 100;
    const fuelEfficiency = (expectedConsumption / actualConsumption) * 100;

    // Cost efficiency (simplified metric)
    const costEfficiency = (weightUtilization * fuelEfficiency) / 100;

    return {
      weightUtilization: Math.round(weightUtilization),
      fuelEfficiency: Math.round(fuelEfficiency),
      costEfficiency: Math.round(costEfficiency),
    };
  }

  /**
   * Calculate detailed working time breakdown for analysis
   */
  calculateWorkingTimeBreakdown(
    oneWayTravelTime: number,
    palletCount: number,
  ): {
    travelTime: number;
    loadingTime: number;
    restTime: number;
    totalTime: number;
  } {
    const roundTripTravelTime = oneWayTravelTime * 2;
    const loadingTime = Math.max(1, palletCount * 0.25);
    const workingTime = roundTripTravelTime + loadingTime;

    // Calculate mandatory rest periods
    const restTime = workingTime > 9 ? Math.floor(workingTime / 9) * 9 : 0;
    const totalTime = workingTime + restTime;

    return {
      travelTime: roundTripTravelTime,
      loadingTime,
      restTime,
      totalTime,
    };
  }
}