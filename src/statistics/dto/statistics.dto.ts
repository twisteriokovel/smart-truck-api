import { IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class YearlyChartsQueryDto {
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(2020)
  @Max(2030)
  year: number;
}

export interface MonthlySummaryResponseDto {
  totalOrders: number;
  totalTrips: number;
  totalFuelLiters: number;
  totalHours: number;
  growth: {
    ordersGrowth: number;
    tripsGrowth: number;
    fuelGrowth: number;
    hoursGrowth: number;
  };
}

export interface ChartDataPoint {
  month: string;
  orders?: number;
  trips?: number;
  expenses?: number;
}

export interface LocationChartData {
  location: string;
  trips: number;
}

export interface TopDriverData {
  driverName: string;
  trips: number;
  workingHours: number;
}

export interface StackedExpenseData {
  month: string;
  fuelCost: number;
  laborCost: number;
  totalExpenses: number;
}

export interface YearlyChartsResponseDto {
  ordersPerMonth: Array<{ month: string; orders: number }>;
  tripsPerMonth: Array<{ month: string; trips: number }>;
  locationsPieChart: LocationChartData[];
  expensesPerMonth: StackedExpenseData[];
  topDriversChart: TopDriverData[];
}