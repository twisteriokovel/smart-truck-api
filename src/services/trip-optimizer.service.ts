import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  IOptimizationInput,
  IOptimizedTrip,
  IBinPackingResult,
  IBin,
  IOptimizationConfig,
} from '../models/smart-trip';
import { IPallet } from '../models/order';
import { ITripTruckInfo } from '../models/trip';
import { Truck } from '../schemas/truck.schema';
import { EnhancedCalculatorService } from './enhanced-calculator.service';

@Injectable()
export class TripOptimizerService {
  private readonly logger = new Logger(TripOptimizerService.name);

  private readonly config: IOptimizationConfig = {
    maxTripsPerOrder: 10,
    minLoadUtilization: 0.3,
    fuelConsumptionRate: 0.35,
    baseDistanceKm: 50,
    prioritizeUtilization: true,
  };

  constructor(
    @InjectModel(Truck.name) private truckModel: Model<Truck>,
    private readonly enhancedCalculator: EnhancedCalculatorService,
  ) {}

  async optimizeTrips(input: IOptimizationInput): Promise<IOptimizedTrip[]> {
    this.logger.log(
      `Starting trip optimization for order ${input.orderId} with ${input.pallets.length} pallets`,
    );

    try {
      const availableTrucks =
        input.availableTrucks || (await this.getAvailableTrucks());

      if (availableTrucks.length === 0) {
        throw new Error('No available trucks found for optimization');
      }

      const sortedPallets = [...input.pallets].sort(
        (a, b) => b.weight - a.weight,
      );

      const sortedTrucks = [...availableTrucks].sort(
        (a, b) => b.maxWeight - a.maxWeight,
      );

      const binPackingResult = this.greedyBinPacking(
        sortedPallets,
        sortedTrucks,
      );

      const optimizedTrips = await this.convertBinsToTrips(
        binPackingResult.bins,
        input.orderId,
        input.destinationAddressId,
      );

      this.logger.log(
        `Optimization completed: ${optimizedTrips.length} trips generated with ${binPackingResult.efficiency.toFixed(2)}% efficiency`,
      );

      return optimizedTrips;
    } catch (error) {
      this.logger.error(
        `Optimization failed for order ${input.orderId}:`,
        error,
      );
      throw error;
    }
  }

  private greedyBinPacking(
    pallets: IPallet[],
    trucks: ITripTruckInfo[],
  ): IBinPackingResult {
    const bins: IBin[] = [];
    let totalCapacity = 0;
    let usedCapacity = 0;

    for (const pallet of pallets) {
      let placed = false;

      for (const bin of bins) {
        if (this.canFitPallet(bin, pallet)) {
          this.addPalletToBin(bin, pallet);
          placed = true;
          break;
        }
      }

      if (!placed) {
        const bestTruck = this.findBestTruckForPallet(trucks, pallet, bins);
        if (!bestTruck) {
          throw new Error(
            `No suitable truck found for pallet ${pallet.id} (weight: ${pallet.weight}kg, height: ${pallet.height}cm). ` +
              `Please ensure trucks have sufficient weight capacity and height clearance.`,
          );
        }

        const newBin = this.createBin(bestTruck);
        this.addPalletToBin(newBin, pallet);
        bins.push(newBin);
      }
    }

    for (const bin of bins) {
      totalCapacity += bin.truck.maxWeight;
      usedCapacity += this.getBinUsedWeight(bin);
    }

    const efficiency =
      totalCapacity > 0 ? (usedCapacity / totalCapacity) * 100 : 0;

    return {
      bins,
      totalBins: bins.length,
      efficiency,
    };
  }
  private canFitPallet(bin: IBin, pallet: IPallet): boolean {
    const currentWeight = this.getBinUsedWeight(bin);
    const weightFits = currentWeight + pallet.weight <= bin.truck.maxWeight;
    const palletCountFits = bin.items.length < bin.truck.maxPallets;
    const palletHeightInMeters = pallet.height / 100; // Convert cm to meters
    const heightFits = palletHeightInMeters <= bin.truck.height;

    return weightFits && palletCountFits && heightFits;
  }

  private addPalletToBin(bin: IBin, pallet: IPallet): void {
    bin.items.push(pallet);
    const usedWeight = this.getBinUsedWeight(bin);
    bin.remainingCapacity = bin.truck.maxWeight - usedWeight;
    bin.utilization = (usedWeight / bin.truck.maxWeight) * 100;
  }

  private findBestTruckForPallet(
    trucks: ITripTruckInfo[],
    pallet: IPallet,
    existingBins: IBin[],
  ): ITripTruckInfo | null {
    const usedTruckIds = new Set(existingBins.map((bin) => bin.truckId));
    const palletHeightInMeters = pallet.height / 100; // Convert cm to meters
    const availableTrucks = trucks.filter(
      (truck) =>
        truck.maxWeight >= pallet.weight &&
        truck.maxPallets >= 1 &&
        truck.height >= palletHeightInMeters &&
        !usedTruckIds.has(truck._id),
    );

    if (availableTrucks.length === 0) {
      return (
        trucks.find(
          (truck) =>
            truck.maxWeight >= pallet.weight &&
            truck.maxPallets >= 1 &&
            truck.height >= palletHeightInMeters,
        ) || null
      );
    }

    let bestTruck: ITripTruckInfo | null = null;
    let bestScore = -1;

    for (const truck of availableTrucks) {
      const utilization = (pallet.weight / truck.maxWeight) * 100;

      const score = utilization - truck.maxWeight / 10000;

      if (
        utilization >= this.config.minLoadUtilization * 100 &&
        score > bestScore
      ) {
        bestScore = score;
        bestTruck = truck;
      }
    }

    if (!bestTruck) {
      bestTruck = availableTrucks.reduce((best, current) =>
        current.maxWeight < best.maxWeight ? current : best,
      );
    }

    return bestTruck;
  }
  private createBin(truck: ITripTruckInfo): IBin {
    return {
      truckId: truck._id,
      truck,
      items: [],
      remainingCapacity: truck.maxWeight,
      utilization: 0,
    };
  }

  private getBinUsedWeight(bin: IBin): number {
    return bin.items.reduce((total, pallet) => total + pallet.weight, 0);
  }

  private async convertBinsToTrips(
    bins: IBin[],
    orderId: string,
    destinationAddressId?: string,
  ): Promise<IOptimizedTrip[]> {
    const trips: IOptimizedTrip[] = [];

    for (const [index, bin] of bins.entries()) {
      const totalWeight = this.getBinUsedWeight(bin);
      const palletCount = bin.items.length;

      // Use enhanced calculator for realistic estimates
      const estimatedFuel =
        await this.enhancedCalculator.calculateEstimatedFuel(
          bin.truck,
          destinationAddressId,
          totalWeight,
        );

      const estimatedDuration =
        await this.enhancedCalculator.calculateEstimatedDuration(
          bin.truck,
          destinationAddressId,
          palletCount,
        );

      // Get address info for route details
      const addressSpec = destinationAddressId
        ? await this.enhancedCalculator.getAddressSpecs(destinationAddressId)
        : undefined;

      const estimatedDistance =
        addressSpec?.range || this.config.baseDistanceKm;

      trips.push({
        truckId: bin.truckId,
        truck: bin.truck,
        pallets: bin.items,
        palletIds: bin.items.map((pallet) => pallet.id),
        estimatedWeight: totalWeight,
        estimatedPalletCount: palletCount,
        estimatedFuel,
        estimatedDuration,
        efficiency: bin.utilization,
        route: {
          startPoint: 'Warehouse',
          endPoint: addressSpec?.city || 'Destination',
          estimatedDistance: estimatedDistance * 2,
          estimatedTime: estimatedDuration,
        },
      });
    }

    return trips;
  }

  private calculateEstimatedFuel(weight: number): number {
    const baseFuel =
      this.config.baseDistanceKm * this.config.fuelConsumptionRate;
    const weightPenalty = (weight / 1000) * 2; // 2L extra per ton
    return Math.round((baseFuel + weightPenalty) * 100) / 100;
  }
  private calculateEstimatedDuration(palletCount: number): number {
    const drivingTime = this.config.baseDistanceKm / 60; // Assume 60km/h average
    const loadingTime = palletCount * 0.25; // 15 minutes per pallet
    return Math.round((drivingTime + loadingTime) * 100) / 100;
  }

  private async getAvailableTrucks(): Promise<ITripTruckInfo[]> {
    try {
      const trucks = await this.truckModel.find({ isActive: true }).lean();
      return trucks.map((truck) => ({
        _id: truck._id.toString(),
        plateNumber: truck.plateNumber,
        vinCode: truck.vinCode,
        registrationCertificate: truck.registrationCertificate,
        driverName: truck.driverName,
        width: truck.width,
        height: truck.height,
        length: truck.length,
        maxWeight: truck.maxWeight,
        truckModel: truck.truckModel,
        model: truck.truckModel,
        fuelCapacity: truck.fuelCapacity,
        manufacturingYear: truck.manufacturingYear,
        notes: truck.notes,
        isActive: truck.isActive,
        maxPallets: truck.maxPallets,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch available trucks:', error);
      throw new Error('Unable to fetch available trucks for optimization');
    }
  }

  updateConfig(newConfig: Partial<IOptimizationConfig>): void {
    Object.assign(this.config, newConfig);
    this.logger.log('Optimization configuration updated', newConfig);
  }

  getConfig(): IOptimizationConfig {
    return { ...this.config };
  }
}
