import { IPallet } from './order';
import { ITripTruckInfo } from './trip';

// Core optimization interfaces
export interface IOptimizationInput {
  pallets: IPallet[];
  orderId: string;
  availableTrucks?: ITripTruckInfo[];
  destinationAddressId?: string;
}

export interface IOptimizedTrip {
  truckId: string;
  truck: ITripTruckInfo;
  pallets: IPallet[]; // Full pallet objects instead of just IDs
  palletIds: string[]; // Keep for backward compatibility
  estimatedWeight: number;
  estimatedPalletCount: number;
  estimatedFuel: number;
  estimatedDuration: number;
  efficiency: number; // Weight utilization percentage
  route?: IRouteInfo;
}

export interface IRouteInfo {
  startPoint: string;
  endPoint: string;
  estimatedDistance: number;
  estimatedTime: number;
}

// LLM enhancement interfaces
export interface ILLMAnalysis {
  reasoning: string;
  risks: string[];
  alternatives: string[];
  confidence: number; // 0-100
}

export interface ISmartTrip extends IOptimizedTrip {
  llmAnalysis: ILLMAnalysis;
}

export interface ISmartOptimizationResult {
  orderId: string;
  trips: ISmartTrip[];
  totalPallets: number;
  totalWeight: number;
  optimizationSummary: {
    totalTrips: number;
    averageEfficiency: number;
    totalEstimatedFuel: number;
    totalEstimatedDuration: number;
  };
  llmOverallAnalysis?: {
    overallStrategy: string;
    potentialImprovements: string[];
    riskAssessment: string;
  };
}

// Historical context interfaces
export interface IHistoricalContext {
  similarOrdersCount: number;
  averageTripsNeeded: number;
  commonIssues: string[];
  seasonalFactors?: string[];
  performanceMetrics: {
    averageFuelEfficiency: number;
    averageLoadUtilization: number;
    onTimeDeliveryRate: number;
  };
}

// Request/Response interfaces
export interface ISmartOptimizationRequest {
  pallets: IPallet[];
  orderId: string;
  includeHistoricalContext?: boolean;
  preferredTrucks?: string[]; // Array of truck IDs
  destinationAddressId?: string;
}

export interface ISmartOptimizationResponse {
  success: boolean;
  data?: ISmartOptimizationResult;
  error?: string;
  processingTime: number;
}

// Internal optimization algorithm interfaces
export interface IBinPackingResult {
  bins: IBin[];
  totalBins: number;
  efficiency: number;
}

export interface IBin {
  truckId: string;
  truck: ITripTruckInfo;
  items: IPallet[];
  remainingCapacity: number;
  utilization: number;
}

// Configuration interfaces
export interface IOptimizationConfig {
  maxTripsPerOrder: number;
  minLoadUtilization: number; // Minimum percentage of truck capacity to use
  fuelConsumptionRate: number; // Liters per km
  baseDistanceKm: number; // Default distance for estimation
  prioritizeUtilization: boolean; // Prioritize load vs truck count
}
