import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../schemas/order.schema';
import { Trip, TripDocument } from '../schemas/trip.schema';
import { Truck, TruckDocument } from '../schemas/truck.schema';
import { OrderStatus } from '../models/order';
import { TripStatus } from '../models/trip';
import {
  MonthlySummaryResponseDto,
  YearlyChartsResponseDto,
  LocationChartData,
  TopDriverData,
  StackedExpenseData,
} from './dto/statistics.dto';

interface IMonthlyStatistics {
  month: string; // YYYY-MM format
  year: number;
  monthName: string; // January, February, etc.
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  totalFuelLiters: number;
  totalFuelCost: number;
  totalHours: number;
  totalLaborCost: number;
  averageOrderValue: number; // Based on cargo weight
  fuelEfficiencyVariance: number; // Actual vs estimated fuel percentage
  timeVariance: number; // Actual vs estimated time percentage
}

interface IStatisticsConfig {
  fuelCostPerLiter: number; // UAH per liter
  averageHourlyWage: number; // UAH per hour
  averageRevenuePerKg: number; // UAH per kg of cargo
}

interface IOrderStatsAggregation {
  _id: {
    year: number;
    month: number;
  };
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalCargoWeight: number;
  averageOrderValue: number;
}

interface ITripStatsAggregation {
  _id: {
    year: number;
    month: number;
  };
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  totalFuelLiters: number;
  totalFuelCost: number;
  totalHours: number;
  totalLaborCost: number;
  fuelEfficiencyVariance: number;
  timeVariance: number;
}

@Injectable()
export class StatisticsService {
  private config: IStatisticsConfig = {
    fuelCostPerLiter: 55, // ~55 UAH per liter in Ukraine
    averageHourlyWage: 200, // ~200 UAH per hour for truck drivers
    averageRevenuePerKg: 3, // ~3 UAH per kg revenue
  };

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    @InjectModel(Truck.name) private truckModel: Model<TruckDocument>,
  ) {}

  async getMonthlyStatistics(
    startDate: Date,
    endDate: Date,
  ): Promise<IMonthlyStatistics[]> {
    const orderStats = await this.getMonthlyOrderStats(startDate, endDate);
    const tripStats = await this.getMonthlyTripStats(startDate, endDate);
    const monthlyStats = this.combineMonthlyStats(orderStats, tripStats);

    return monthlyStats.sort((a, b) => a.month.localeCompare(b.month));
  }

  private async getMonthlyOrderStats(
    startDate: Date,
    endDate: Date,
  ): Promise<IOrderStatsAggregation[]> {
    return await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', OrderStatus.DONE] }, 1, 0] },
          },
          cancelledOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', OrderStatus.CANCELLED] }, 1, 0],
            },
          },
          totalCargoWeight: { $sum: '$cargoWeight' },
        },
      },
      {
        $project: {
          _id: 1,
          totalOrders: 1,
          completedOrders: 1,
          cancelledOrders: 1,
          totalCargoWeight: 1,
          averageOrderValue: {
            $multiply: ['$totalCargoWeight', this.config.averageRevenuePerKg],
          },
        },
      },
    ]);
  }

  private async getMonthlyTripStats(
    startDate: Date,
    endDate: Date,
  ): Promise<ITripStatsAggregation[]> {
    return await this.tripModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          totalTrips: { $sum: 1 },
          completedTrips: {
            $sum: { $cond: [{ $eq: ['$status', TripStatus.DONE] }, 1, 0] },
          },
          cancelledTrips: {
            $sum: { $cond: [{ $eq: ['$status', TripStatus.CANCELLED] }, 1, 0] },
          },
          totalEstimatedFuel: { $sum: '$estimatedFuel' },
          totalActualFuel: {
            $sum: {
              $cond: [
                { $ne: ['$actualFuel', null] },
                '$actualFuel',
                '$estimatedFuel',
              ],
            },
          },
          totalEstimatedHours: { $sum: '$estimatedDuration' },
          totalActualHours: {
            $sum: {
              $cond: [
                { $ne: ['$actualDuration', null] },
                '$actualDuration',
                '$estimatedDuration',
              ],
            },
          },
          fuelVarianceSum: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$actualFuel', null] },
                    { $gt: ['$estimatedFuel', 0] },
                  ],
                },
                {
                  $divide: [
                    { $subtract: ['$actualFuel', '$estimatedFuel'] },
                    '$estimatedFuel',
                  ],
                },
                0,
              ],
            },
          },
          timeVarianceSum: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$actualDuration', null] },
                    { $gt: ['$estimatedDuration', 0] },
                  ],
                },
                {
                  $divide: [
                    { $subtract: ['$actualDuration', '$estimatedDuration'] },
                    '$estimatedDuration',
                  ],
                },
                0,
              ],
            },
          },
          completedTripsWithActuals: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', TripStatus.DONE] },
                    { $ne: ['$actualFuel', null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          totalTrips: 1,
          completedTrips: 1,
          cancelledTrips: 1,
          totalFuelLiters: '$totalActualFuel',
          totalFuelCost: {
            $multiply: ['$totalActualFuel', this.config.fuelCostPerLiter],
          },
          totalHours: '$totalActualHours',
          totalLaborCost: {
            $multiply: ['$totalActualHours', this.config.averageHourlyWage],
          },
          fuelEfficiencyVariance: {
            $cond: [
              { $gt: ['$completedTripsWithActuals', 0] },
              {
                $multiply: [
                  {
                    $divide: ['$fuelVarianceSum', '$completedTripsWithActuals'],
                  },
                  100,
                ],
              },
              0,
            ],
          },
          timeVariance: {
            $cond: [
              { $gt: ['$completedTripsWithActuals', 0] },
              {
                $multiply: [
                  {
                    $divide: ['$timeVarianceSum', '$completedTripsWithActuals'],
                  },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
    ]);
  }

  private combineMonthlyStats(
    orderStats: IOrderStatsAggregation[],
    tripStats: ITripStatsAggregation[],
  ): IMonthlyStatistics[] {
    const monthMap = new Map<string, IMonthlyStatistics>();

    // Initialize with order stats
    orderStats.forEach((order) => {
      const monthKey = `${order._id.year}-${order._id.month.toString().padStart(2, '0')}`;
      const monthName = this.getMonthName(order._id.month);

      monthMap.set(monthKey, {
        month: monthKey,
        year: order._id.year,
        monthName,
        totalOrders: order.totalOrders || 0,
        completedOrders: order.completedOrders || 0,
        cancelledOrders: order.cancelledOrders || 0,
        totalTrips: 0,
        completedTrips: 0,
        cancelledTrips: 0,
        totalFuelLiters: 0,
        totalFuelCost: 0,
        totalHours: 0,
        totalLaborCost: 0,
        averageOrderValue: order.averageOrderValue || 0,
        fuelEfficiencyVariance: 0,
        timeVariance: 0,
      });
    });

    // Add trip stats
    tripStats.forEach((trip) => {
      const monthKey = `${trip._id.year}-${trip._id.month.toString().padStart(2, '0')}`;
      const monthName = this.getMonthName(trip._id.month);

      const existing = monthMap.get(monthKey);
      if (existing) {
        existing.totalTrips = trip.totalTrips || 0;
        existing.completedTrips = trip.completedTrips || 0;
        existing.cancelledTrips = trip.cancelledTrips || 0;
        existing.totalFuelLiters = trip.totalFuelLiters || 0;
        existing.totalFuelCost = trip.totalFuelCost || 0;
        existing.totalHours = trip.totalHours || 0;
        existing.totalLaborCost = trip.totalLaborCost || 0;
        existing.fuelEfficiencyVariance = trip.fuelEfficiencyVariance || 0;
        existing.timeVariance = trip.timeVariance || 0;
      } else {
        // Month with trips but no orders
        monthMap.set(monthKey, {
          month: monthKey,
          year: trip._id.year,
          monthName,
          totalOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0,
          totalTrips: trip.totalTrips || 0,
          completedTrips: trip.completedTrips || 0,
          cancelledTrips: trip.cancelledTrips || 0,
          totalFuelLiters: trip.totalFuelLiters || 0,
          totalFuelCost: trip.totalFuelCost || 0,
          totalHours: trip.totalHours || 0,
          totalLaborCost: trip.totalLaborCost || 0,
          averageOrderValue: 0,
          fuelEfficiencyVariance: trip.fuelEfficiencyVariance || 0,
          timeVariance: trip.timeVariance || 0,
        });
      }
    });

    return Array.from(monthMap.values());
  }

  private getMonthName(monthNumber: number): string {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months[monthNumber - 1];
  }

  async getMonthlySummary(): Promise<MonthlySummaryResponseDto> {
    const currentDate = new Date();
    const currentMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const nextMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1,
    );
    const previousMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1,
    );

    // Get current month data
    const currentMonthStats = await this.getMonthlyStatistics(
      currentMonth,
      nextMonth,
    );
    const currentData = currentMonthStats[0] || {
      totalOrders: 0,
      totalTrips: 0,
      totalFuelLiters: 0,
      totalHours: 0,
    };

    // Get previous month data
    const previousMonthStats = await this.getMonthlyStatistics(
      previousMonth,
      currentMonth,
    );
    const previousData = previousMonthStats[0] || {
      totalOrders: 0,
      totalTrips: 0,
      totalFuelLiters: 0,
      totalHours: 0,
    };

    // Calculate growth percentages
    const calculateGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      totalOrders: currentData.totalOrders,
      totalTrips: currentData.totalTrips,
      totalFuelLiters: Math.round(currentData.totalFuelLiters),
      totalHours: Math.round(currentData.totalHours),
      growth: {
        ordersGrowth: calculateGrowth(
          currentData.totalOrders,
          previousData.totalOrders,
        ),
        tripsGrowth: calculateGrowth(
          currentData.totalTrips,
          previousData.totalTrips,
        ),
        fuelGrowth: calculateGrowth(
          currentData.totalFuelLiters,
          previousData.totalFuelLiters,
        ),
        hoursGrowth: calculateGrowth(
          currentData.totalHours,
          previousData.totalHours,
        ),
      },
    };
  }

  async getYearlyChartsData(year: number): Promise<YearlyChartsResponseDto> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

    // Get monthly statistics for the year
    const monthlyStats = await this.getMonthlyStatistics(startDate, endDate);

    // Prepare orders per month data
    const ordersPerMonth = Array.from({ length: 12 }, (_, i) => {
      const monthKey = `${year}-${(i + 1).toString().padStart(2, '0')}`;
      const monthData = monthlyStats.find((stat) => stat.month === monthKey);
      return {
        month: this.getMonthName(i + 1),
        orders: monthData?.totalOrders || 0,
      };
    });

    // Prepare trips per month data
    const tripsPerMonth = Array.from({ length: 12 }, (_, i) => {
      const monthKey = `${year}-${(i + 1).toString().padStart(2, '0')}`;
      const monthData = monthlyStats.find((stat) => stat.month === monthKey);
      return {
        month: this.getMonthName(i + 1),
        trips: monthData?.totalTrips || 0,
      };
    });

    // Get locations pie chart data
    const locationsPieChart = await this.getLocationsPieChartData(
      startDate,
      endDate,
    );

    // Get top drivers chart data
    const topDriversChart = await this.getTopDriversChartData(
      startDate,
      endDate,
    );

    // Prepare expenses per month data (stacked bar format)
    const expensesPerMonth: StackedExpenseData[] = Array.from(
      { length: 12 },
      (_, i) => {
        const monthKey = `${year}-${(i + 1).toString().padStart(2, '0')}`;
        const monthData = monthlyStats.find((stat) => stat.month === monthKey);
        const fuelCost = Math.round(monthData?.totalFuelCost || 0);
        const laborCost = Math.round(monthData?.totalLaborCost || 0);

        return {
          month: this.getMonthName(i + 1),
          fuelCost,
          laborCost,
          totalExpenses: fuelCost + laborCost,
        };
      },
    );

    return {
      ordersPerMonth,
      tripsPerMonth,
      locationsPieChart,
      expensesPerMonth,
      topDriversChart,
    };
  }

  private async getLocationsPieChartData(
    startDate: Date,
    endDate: Date,
  ): Promise<LocationChartData[]> {
    const result: LocationChartData[] = await this.tripModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $ne: 'CANCELLED' },
        },
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'order',
        },
      },
      {
        $unwind: '$order',
      },
      {
        $lookup: {
          from: 'addresses',
          localField: 'order.destinationAddressId',
          foreignField: '_id',
          as: 'address',
        },
      },
      {
        $unwind: '$address',
      },
      {
        $group: {
          _id: '$address.city',
          trips: { $sum: 1 },
        },
      },
      {
        $project: {
          location: '$_id',
          trips: 1,
          _id: 0,
        },
      },
      {
        $sort: { trips: -1 },
      },
    ]);

    return result;
  }

  private async getTopDriversChartData(
    startDate: Date,
    endDate: Date,
  ): Promise<TopDriverData[]> {
    const result: TopDriverData[] = await this.tripModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $ne: TripStatus.CANCELLED },
        },
      },
      {
        $lookup: {
          from: 'trucks',
          localField: 'truckId',
          foreignField: '_id',
          as: 'truck',
        },
      },
      {
        $unwind: '$truck',
      },
      {
        $group: {
          _id: '$truck.driverName',
          trips: { $sum: 1 },
          totalActualHours: {
            $sum: {
              $cond: [
                { $ne: ['$actualDuration', null] },
                '$actualDuration',
                '$estimatedDuration',
              ],
            },
          },
        },
      },
      {
        $project: {
          driverName: '$_id',
          trips: 1,
          workingHours: { $round: ['$totalActualHours', 1] },
          _id: 0,
        },
      },
      {
        $sort: { workingHours: -1 },
      },
      {
        $limit: 5,
      },
    ]);

    return result;
  }
}
