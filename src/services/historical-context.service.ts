import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IHistoricalContext } from '../models/smart-trip';
import { IPallet } from '../models/order';
import { Order } from '../schemas/order.schema';
import { Trip } from '../schemas/trip.schema';
import { IOrderResponse } from '../models/order';

interface IHistoricalTripData {
  _id: string; // ObjectId from MongoDB
  orderId: string; // ObjectId from MongoDB
  actualFuel?: number;
  estimatedFuel: number;
  actualDuration?: number;
  estimatedDuration: number;
  palletIds: string[];
  notes?: string;
  status: string;
  truckId: {
    _id: string;
    maxWeight: number;
    maxPallets: number;
  };
}

@Injectable()
export class HistoricalContextService {
  private readonly logger = new Logger(HistoricalContextService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Trip.name) private tripModel: Model<Trip>,
  ) {}
  async getHistoricalContext(
    pallets: IPallet[],
    orderId: string,
  ): Promise<IHistoricalContext> {
    const startTime = Date.now();
    const TIMEOUT_MS = 10000;

    try {
      this.logger.log(`Fetching historical context for order ${orderId}`);

      const totalWeight = pallets.reduce(
        (sum, pallet) => sum + pallet.weight,
        0,
      );
      const palletCount = pallets.length;

      const timeoutPromise = new Promise<IHistoricalContext>((_, reject) =>
        setTimeout(
          () => reject(new Error('Historical context timeout')),
          TIMEOUT_MS,
        ),
      );

      const processingPromise = this.getHistoricalContextInternal(
        totalWeight,
        palletCount,
      );

      const result = await Promise.race([processingPromise, timeoutPromise]);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Historical context retrieved for order ${orderId} in ${processingTime}ms`,
      );

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `Failed to fetch historical context for order ${orderId} in ${processingTime}ms:`,
        error,
      );
      return this.createDefaultContext();
    }
  }

  private async getHistoricalContextInternal(
    totalWeight: number,
    palletCount: number,
  ): Promise<IHistoricalContext> {
    const queryStartTime = Date.now();

    const similarOrders = await this.findSimilarOrders(
      totalWeight,
      palletCount,
    );

    const similarOrdersTime = Date.now() - queryStartTime;
    this.logger.debug(
      `Found ${similarOrders.length} similar orders in ${similarOrdersTime}ms`,
    );

    if (similarOrders.length === 0) {
      return this.createDefaultContext();
    }

    const tripsQueryStart = Date.now();
    const tripsData = await this.getTripsForOrders(
      similarOrders.map((order) => (order as IOrderResponse)._id.toString()),
    );
    const tripsQueryTime = Date.now() - tripsQueryStart;
    this.logger.debug(
      `Retrieved ${tripsData.length} trips in ${tripsQueryTime}ms`,
    );

    const metricsStart = Date.now();
    const performanceMetrics =
      await this.calculatePerformanceMetrics(tripsData);
    const commonIssues = await this.identifyCommonIssues(tripsData);
    const seasonalFactors = this.analyzeSeasonalFactors();
    const metricsTime = Date.now() - metricsStart;
    this.logger.debug(`Calculated metrics in ${metricsTime}ms`);

    return {
      similarOrdersCount: similarOrders.length,
      averageTripsNeeded: this.calculateAverageTripsNeeded(
        similarOrders,
        tripsData,
      ),
      commonIssues,
      seasonalFactors,
      performanceMetrics,
    };
  }

  private async findSimilarOrders(
    targetWeight: number,
    targetPalletCount: number,
  ): Promise<any[]> {
    const weightTolerance = 0.3;
    const palletTolerance = 2;

    const minWeight = targetWeight * (1 - weightTolerance);
    const maxWeight = targetWeight * (1 + weightTolerance);
    const minPallets = Math.max(1, targetPalletCount - palletTolerance);
    const maxPallets = targetPalletCount + palletTolerance;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return await this.orderModel
      .find({
        cargoWeight: { $gte: minWeight, $lte: maxWeight },
        'pallets.length': { $gte: minPallets, $lte: maxPallets },
        status: 'done',
        createdAt: { $gte: sixMonthsAgo },
      })
      .select('_id cargoWeight pallets.length createdAt') // Only select needed fields
      .limit(30) // Reduced from 50 to 30 for better performance
      .lean();
  }

  private async getTripsForOrders(
    orderIds: string[],
  ): Promise<IHistoricalTripData[]> {
    const trips = await this.tripModel
      .find({
        orderId: { $in: orderIds },
        status: 'done',
      })
      .select(
        'orderId actualFuel estimatedFuel actualDuration estimatedDuration palletIds notes truckId',
      )
      .populate('truckId', 'maxWeight maxPallets') // Only populate needed truck fields
      .lean();

    return trips as unknown as IHistoricalTripData[];
  }

  private async calculatePerformanceMetrics(
    trips: IHistoricalTripData[],
  ): Promise<{
    averageFuelEfficiency: number;
    averageLoadUtilization: number;
    onTimeDeliveryRate: number;
  }> {
    if (trips.length === 0) {
      return {
        averageFuelEfficiency: 35.0, // Default values
        averageLoadUtilization: 75.0,
        onTimeDeliveryRate: 85.0,
      };
    }

    const fuelData = trips.filter(
      (trip) => trip.actualFuel && trip.actualFuel > 0,
    );
    const averageFuelEfficiency =
      fuelData.length > 0
        ? fuelData.reduce((sum, trip) => sum + (trip.actualFuel || 0), 0) /
          fuelData.length
        : 35.0;

    const utilizationData = trips.filter(
      (trip) =>
        trip.truckId &&
        trip.truckId.maxWeight &&
        trip.palletIds &&
        trip.palletIds.length > 0,
    );

    let totalUtilization = 0;
    let validUtilizationCount = 0;

    for (const trip of utilizationData) {
      const estimatedWeight = trip.palletIds.length * 500; // Assume 500kg per pallet average
      const utilization = (estimatedWeight / trip.truckId.maxWeight) * 100;

      if (utilization <= 100) {
        totalUtilization += utilization;
        validUtilizationCount++;
      }
    }

    const averageLoadUtilization =
      validUtilizationCount > 0
        ? totalUtilization / validUtilizationCount
        : 75.0;

    const completedTrips = trips.filter(
      (trip) => trip.status === 'done',
    ).length;
    const onTimeDeliveryRate =
      trips.length > 0 ? (completedTrips / trips.length) * 100 : 85.0;

    return {
      averageFuelEfficiency: Math.round(averageFuelEfficiency * 100) / 100,
      averageLoadUtilization: Math.round(averageLoadUtilization * 100) / 100,
      onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 100) / 100,
    };
  }

  private calculateAverageTripsNeeded(
    orders: any[],
    trips: IHistoricalTripData[],
  ): number {
    if (orders.length === 0) return 2.0;

    const orderTripCounts = new Map<string, number>();

    for (const trip of trips) {
      const orderId = trip.orderId.toString();
      orderTripCounts.set(orderId, (orderTripCounts.get(orderId) || 0) + 1);
    }

    // Calculate average
    const tripCounts = Array.from(orderTripCounts.values());
    const average =
      tripCounts.length > 0
        ? tripCounts.reduce((sum, count) => sum + count, 0) / tripCounts.length
        : 2.0;

    return Math.round(average * 100) / 100;
  }

  private async identifyCommonIssues(
    trips: IHistoricalTripData[],
  ): Promise<string[]> {
    const issues: string[] = [];

    const tripsWithNotes = trips.filter(
      (trip) => trip.notes && trip.notes.trim().length > 0,
    );

    if (tripsWithNotes.length > 0) {
      const noteText = tripsWithNotes
        .map((trip) => trip.notes?.toLowerCase() || '')
        .join(' ');

      if (noteText.includes('delay') || noteText.includes('late')) {
        issues.push('Delivery delays reported in similar orders');
      }

      if (noteText.includes('fuel') || noteText.includes('consumption')) {
        issues.push('Fuel consumption concerns noted');
      }

      if (noteText.includes('weight') || noteText.includes('overload')) {
        issues.push('Weight distribution challenges');
      }

      if (
        noteText.includes('weather') ||
        noteText.includes('rain') ||
        noteText.includes('snow')
      ) {
        issues.push('Weather-related complications');
      }

      if (noteText.includes('driver') || noteText.includes('availability')) {
        issues.push('Driver availability issues');
      }
    }

    const fuelTrips = trips.filter(
      (trip) => trip.actualFuel && trip.estimatedFuel,
    );
    const overFuelTrips = fuelTrips.filter(
      (trip) =>
        trip.actualFuel &&
        trip.estimatedFuel &&
        trip.actualFuel > trip.estimatedFuel * 1.2,
    );

    if (overFuelTrips.length > fuelTrips.length * 0.3) {
      issues.push('Frequent fuel consumption overruns');
    }

    const durationTrips = trips.filter(
      (trip) => trip.actualDuration && trip.estimatedDuration,
    );
    const overDurationTrips = durationTrips.filter(
      (trip) =>
        trip.actualDuration &&
        trip.estimatedDuration &&
        trip.actualDuration > trip.estimatedDuration * 1.3,
    );

    if (overDurationTrips.length > durationTrips.length * 0.25) {
      issues.push('Trip duration frequently exceeds estimates');
    }

    if (issues.length === 0) {
      issues.push('Standard delivery risks apply');
      issues.push('Weather conditions may affect schedule');
    }

    return issues.slice(0, 5);
  }

  private analyzeSeasonalFactors(): string[] {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const factors: string[] = [];

    if (month === 11 || month === 0 || month === 1) {
      factors.push('Winter weather may affect delivery times');
      factors.push('Increased fuel consumption due to cold weather');
    }

    if (month >= 2 && month <= 4) {
      factors.push('Spring weather generally favorable for logistics');
      factors.push('Potential for increased construction affecting routes');
    }

    if (month >= 5 && month <= 7) {
      factors.push('Peak logistics season - high truck demand');
      factors.push('Heat may affect driver performance and vehicle efficiency');
    }

    if (month >= 8 && month <= 10) {
      factors.push('Harvest season may increase rural traffic');
      factors.push('Weather transition period - variable conditions');
    }

    if (month === 11) {
      factors.push('Holiday season - potential shipping delays');
    }

    return factors;
  }

  private createDefaultContext(): IHistoricalContext {
    return {
      similarOrdersCount: 0,
      averageTripsNeeded: 2.0,
      commonIssues: [
        'No historical data available',
        'Standard delivery risks apply',
        'Weather conditions may affect schedule',
      ],
      seasonalFactors: this.analyzeSeasonalFactors(),
      performanceMetrics: {
        averageFuelEfficiency: 35.0,
        averageLoadUtilization: 75.0,
        onTimeDeliveryRate: 85.0,
      },
    };
  }

  async getPerformanceTrends(days: number = 30): Promise<{
    totalOrders: number;
    totalTrips: number;
    averageTripsPerOrder: number;
    fuelEfficiencyTrend: number;
    utilizationTrend: number;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const recentOrders = await this.orderModel
        .find({
          status: 'done',
          createdAt: { $gte: startDate },
        })
        .lean();

      const recentTrips = await this.getTripsForOrders(
        recentOrders.map((order) => order._id.toString()),
      );

      const metrics = await this.calculatePerformanceMetrics(recentTrips);

      return {
        totalOrders: recentOrders.length,
        totalTrips: recentTrips.length,
        averageTripsPerOrder:
          recentOrders.length > 0
            ? recentTrips.length / recentOrders.length
            : 0,
        fuelEfficiencyTrend: metrics.averageFuelEfficiency,
        utilizationTrend: metrics.averageLoadUtilization,
      };
    } catch (error) {
      this.logger.error('Failed to get performance trends:', error);
      throw error;
    }
  }
}
