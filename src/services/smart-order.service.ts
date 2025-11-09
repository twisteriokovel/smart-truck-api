import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  IOptimizedTrip,
  ISmartTrip,
  ISmartOptimizationResult,
  ILLMAnalysis,
  IHistoricalContext,
  ISmartOptimizationRequest,
  ISmartOptimizationResponse,
} from '../models/smart-trip';
import { TripOptimizerService } from './trip-optimizer.service';
import { HistoricalContextService } from './historical-context.service';
import { EnhancedCalculatorService } from './enhanced-calculator.service';

interface ILLMAnalysisRawResponse {
  reasoning?: string;
  risks?: unknown;
  alternatives?: unknown;
  confidence?: unknown;
}

interface IOverallAnalysisRawResponse {
  overallStrategy?: string;
  potentialImprovements?: unknown;
  riskAssessment?: string;
}

@Injectable()
export class SmartOrderService {
  private readonly logger = new Logger(SmartOrderService.name);
  private readonly anthropic: Anthropic;

  constructor(
    private readonly tripOptimizer: TripOptimizerService,
    private readonly historicalContext: HistoricalContextService,
    private readonly enhancedCalculator: EnhancedCalculatorService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.anthropic = new Anthropic({
      apiKey,
      timeout: 60000, // 60 seconds timeout
    });
  }

  async createSmartOptimization(
    request: ISmartOptimizationRequest,
  ): Promise<ISmartOptimizationResponse> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Starting smart optimization for order ${request.orderId}`,
      );

      // Step 1: Run core optimization algorithm
      const optimizedTrips = await this.tripOptimizer.optimizeTrips({
        pallets: request.pallets,
        orderId: request.orderId,
        destinationAddressId: request.destinationAddressId,
      });

      if (optimizedTrips.length === 0) {
        throw new Error(
          'No trips could be generated from the optimization algorithm',
        );
      }

      // Step 2: Get historical context if requested
      let historicalContext: IHistoricalContext | undefined;
      if (request.includeHistoricalContext) {
        historicalContext = await this.historicalContext.getHistoricalContext(
          request.pallets,
          request.orderId,
        );
      }

      // Step 3: Enhance trips with LLM analysis
      const smartTrips = await this.enhanceTripsWithLLM(
        optimizedTrips,
        request,
        historicalContext,
      );

      // Step 4: Generate overall analysis
      const llmOverallAnalysis = await this.generateOverallAnalysis(
        smartTrips,
        request,
        historicalContext,
      );

      // Step 5: Compile final result
      const result: ISmartOptimizationResult = {
        orderId: request.orderId,
        trips: smartTrips,
        totalPallets: request.pallets.length,
        totalWeight: request.pallets.reduce((sum, p) => sum + p.weight, 0),
        optimizationSummary: this.calculateOptimizationSummary(smartTrips),
        llmOverallAnalysis,
      };

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Smart optimization completed in ${processingTime}ms for order ${request.orderId}`,
      );

      return {
        success: true,
        data: result,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `Smart optimization failed for order ${request.orderId}:`,
        error,
      );

      return {
        success: false,
        error: error || 'Unknown error occurred during optimization',
        processingTime,
      };
    }
  }

  private async enhanceTripsWithLLM(
    trips: IOptimizedTrip[],
    request: ISmartOptimizationRequest,
    historicalContext?: IHistoricalContext,
  ): Promise<ISmartTrip[]> {
    this.logger.log(`Starting LLM analysis for ${trips.length} trips`);

    const enhancedTrips: ISmartTrip[] = [];

    for (const [index, trip] of trips.entries()) {
      try {
        this.logger.debug(`Analyzing trip ${index + 1}/${trips.length}`);

        const llmAnalysis = await this.analyzeTripWithLLM(
          trip,
          index + 1,
          trips.length,
          request,
          historicalContext,
        );

        enhancedTrips.push({
          ...trip,
          llmAnalysis,
        });

        this.logger.debug(`Trip ${index + 1} analysis completed successfully`);
      } catch (error) {
        this.logger.warn(
          `LLM analysis failed for trip ${index + 1}, using fallback:`,
          error,
        );

        enhancedTrips.push({
          ...trip,
          llmAnalysis: this.createFallbackAnalysis(trip),
        });
      }
    }

    this.logger.log(`Completed LLM analysis for all ${trips.length} trips`);
    return enhancedTrips;
  }

  private async analyzeTripWithLLM(
    trip: IOptimizedTrip,
    tripNumber: number,
    totalTrips: number,
    request: ISmartOptimizationRequest,
    historicalContext?: IHistoricalContext,
  ): Promise<ILLMAnalysis> {
    const TRIP_ANALYSIS_TIMEOUT = 45000;
    const startTime = Date.now();

    try {
      const prompt = await this.buildTripAnalysisPrompt(
        trip,
        tripNumber,
        totalTrips,
        request,
        historicalContext,
      );

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Trip analysis timeout after ${TRIP_ANALYSIS_TIMEOUT}ms`,
              ),
            ),
          TRIP_ANALYSIS_TIMEOUT,
        ),
      );

      const apiCallPromise = this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1000,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const response = await Promise.race([apiCallPromise, timeoutPromise]);

      const processingTime = Date.now() - startTime;
      this.logger.debug(
        `Trip ${tripNumber} analysis completed in ${processingTime}ms`,
      );

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude API');
      }

      return this.parseLLMAnalysisResponse(content.text);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.warn(
        `Trip ${tripNumber} analysis failed after ${processingTime}ms:`,
        error,
      );
      throw error;
    }
  }

  private async buildTripAnalysisPrompt(
    trip: IOptimizedTrip,
    tripNumber: number,
    totalTrips: number,
    request: ISmartOptimizationRequest,
    historicalContext?: IHistoricalContext,
  ): Promise<string> {
    const truckSpecs = this.enhancedCalculator.getTruckSpecs(trip.truck._id);
    const addressSpecs = request.destinationAddressId
      ? await this.enhancedCalculator.getAddressSpecs(
          request.destinationAddressId,
        )
      : undefined;

    const efficiencyMetrics =
      this.enhancedCalculator.calculateEfficiencyMetrics(
        trip.truck,
        trip.estimatedWeight,
        trip.estimatedFuel,
        addressSpecs?.range,
      );

    let prompt = `You are a logistics optimization expert analyzing a truck trip assignment. Provide analysis in JSON format with these exact fields:

{
  "reasoning": "string - why this assignment makes sense",
  "risks": ["array of potential issues/risks"],
  "alternatives": ["array of alternative approaches"],
  "confidence": number (0-100)
}

TRIP DETAILS:
- Trip ${tripNumber} of ${totalTrips}
- Truck: ${trip.truck.plateNumber} (Driver: ${trip.truck.driverName})
- Truck Model: ${truckSpecs?.model || 'Unknown'}
- Truck Specs: ${trip.truck.maxWeight}kg capacity, ${trip.truck.maxPallets} pallets max
- Fuel Consumption: ${truckSpecs?.consumption || 'Unknown'}L/100km
- Average Speed: ${truckSpecs?.averageSpeed || 'Unknown'}km/h

ROUTE INFORMATION:
- Destination: ${trip.route?.endPoint || 'Unknown'}
- Distance: ${addressSpecs?.range || 'Unknown'}km (one-way)
- Estimated Travel Time: ${addressSpecs?.time || 'Unknown'}h (one-way)
- Total Trip Distance: ${trip.route?.estimatedDistance || 'Unknown'}km (round-trip)

LOAD ASSIGNMENT:
- Assigned Load: ${trip.estimatedWeight}kg, ${trip.estimatedPalletCount} pallets
- Weight Utilization: ${efficiencyMetrics.weightUtilization}%
- Estimated Fuel: ${trip.estimatedFuel}L
- Fuel Efficiency: ${efficiencyMetrics.fuelEfficiency}%
- Estimated Duration: ${trip.estimatedDuration}h
- Cost Efficiency Score: ${efficiencyMetrics.costEfficiency}%

ORDER CONTEXT:
- Order ID: ${request.orderId}
- Total Pallets: ${request.pallets.length}
- Total Weight: ${request.pallets.reduce((sum, p) => sum + p.weight, 0)}kg`;

    if (historicalContext) {
      prompt += `

HISTORICAL CONTEXT:
- Similar orders processed: ${historicalContext.similarOrdersCount}
- Average trips needed: ${historicalContext.averageTripsNeeded}
- Common issues: ${historicalContext.commonIssues.join(', ')}
- Average fuel efficiency: ${historicalContext.performanceMetrics.averageFuelEfficiency}L/trip
- Average load utilization: ${historicalContext.performanceMetrics.averageLoadUtilization}%`;
    }

    prompt += `

ANALYSIS REQUIREMENTS:
1. Reasoning: Explain why this truck-load assignment is logical
2. Risks: Identify 2-3 potential operational risks or issues
3. Alternatives: Suggest 2-3 alternative approaches if this trip fails
4. Confidence: Rate confidence in this assignment (0-100)

Respond only with valid JSON. Be concise but thorough.`;

    return prompt;
  }

  private async generateOverallAnalysis(
    trips: ISmartTrip[],
    request: ISmartOptimizationRequest,
    historicalContext?: IHistoricalContext,
  ): Promise<{
    overallStrategy: string;
    potentialImprovements: string[];
    riskAssessment: string;
  }> {
    const OVERALL_ANALYSIS_TIMEOUT = 30000;
    const startTime = Date.now();

    const prompt = this.buildOverallAnalysisPrompt(
      trips,
      request,
      historicalContext,
    );

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Overall analysis timeout after ${OVERALL_ANALYSIS_TIMEOUT}ms`,
              ),
            ),
          OVERALL_ANALYSIS_TIMEOUT,
        ),
      );

      const apiCallPromise = this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 800,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const response = await Promise.race([apiCallPromise, timeoutPromise]);

      const processingTime = Date.now() - startTime;
      this.logger.debug(`Overall analysis completed in ${processingTime}ms`);

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude API');
      }

      return this.parseOverallAnalysisResponse(content.text);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.warn(
        `Overall LLM analysis failed after ${processingTime}ms, using fallback:`,
        error,
      );
      return this.createFallbackOverallAnalysis(trips);
    }
  }

  private buildOverallAnalysisPrompt(
    trips: ISmartTrip[],
    request: ISmartOptimizationRequest,
    historicalContext?: IHistoricalContext,
  ): string {
    const avgEfficiency =
      trips.reduce((sum, trip) => sum + trip.efficiency, 0) / trips.length;
    const totalFuel = trips.reduce((sum, trip) => sum + trip.estimatedFuel, 0);
    const avgConfidence =
      trips.reduce((sum, trip) => sum + trip.llmAnalysis.confidence, 0) /
      trips.length;

    let prompt = `You are a logistics optimization expert providing overall analysis of a trip optimization plan. Respond in JSON format:

{
  "overallStrategy": "string - summary of the optimization approach",
  "potentialImprovements": ["array of suggestions for improvement"],
  "riskAssessment": "string - overall risk assessment"
}

OPTIMIZATION SUMMARY:
- Order: ${request.orderId}
- Total trips planned: ${trips.length}
- Average efficiency: ${avgEfficiency.toFixed(1)}%
- Total estimated fuel: ${totalFuel.toFixed(1)}L
- Average confidence: ${avgConfidence.toFixed(1)}%

TRIP BREAKDOWN:`;

    trips.forEach((trip, index) => {
      prompt += `
- Trip ${index + 1}: ${trip.truck.plateNumber}, ${trip.estimatedWeight}kg (${trip.efficiency.toFixed(1)}% efficiency)`;
    });

    if (historicalContext) {
      prompt += `

HISTORICAL BENCHMARKS:
- Typical trips for similar orders: ${historicalContext.averageTripsNeeded}
- Industry average efficiency: ${historicalContext.performanceMetrics.averageLoadUtilization}%`;
    }

    prompt += `

Provide strategic insights about this optimization plan. Be concise but actionable.`;

    return prompt;
  }

  private parseLLMAnalysisResponse(response: string): ILLMAnalysis {
    try {
      const cleanedResponse = response.replace(/```json\s*|\s*```/g, '').trim();
      const parsed: ILLMAnalysisRawResponse = JSON.parse(cleanedResponse);

      const risks = Array.isArray(parsed.risks)
        ? parsed.risks.filter(
            (risk): risk is string => typeof risk === 'string',
          )
        : [];

      const alternatives = Array.isArray(parsed.alternatives)
        ? parsed.alternatives.filter(
            (alt): alt is string => typeof alt === 'string',
          )
        : [];

      const confidence =
        typeof parsed.confidence === 'number'
          ? Math.max(0, Math.min(100, parsed.confidence))
          : 50;

      return {
        reasoning: parsed.reasoning || 'No reasoning provided',
        risks,
        alternatives,
        confidence,
      };
    } catch (error) {
      this.logger.warn('Failed to parse LLM response, using fallback:', error);
      return {
        reasoning: 'Analysis parsing failed',
        risks: ['Unable to analyze risks'],
        alternatives: ['Contact logistics team for manual review'],
        confidence: 50,
      };
    }
  }

  private parseOverallAnalysisResponse(response: string): {
    overallStrategy: string;
    potentialImprovements: string[];
    riskAssessment: string;
  } {
    try {
      const cleanedResponse = response.replace(/```json\s*|\s*```/g, '').trim();
      const parsed: IOverallAnalysisRawResponse = JSON.parse(cleanedResponse);

      const potentialImprovements = Array.isArray(parsed.potentialImprovements)
        ? parsed.potentialImprovements.filter(
            (improvement): improvement is string =>
              typeof improvement === 'string',
          )
        : [];

      return {
        overallStrategy:
          parsed.overallStrategy || 'Standard optimization approach',
        potentialImprovements,
        riskAssessment:
          parsed.riskAssessment || 'Standard operational risks apply',
      };
    } catch (error) {
      this.logger.warn(
        'Failed to parse overall analysis, using fallback:',
        error,
      );
      return {
        overallStrategy:
          'Automated optimization with manual review recommended',
        potentialImprovements: [
          'Review trip assignments manually',
          'Consider route optimization',
        ],
        riskAssessment: 'Moderate risk - standard monitoring recommended',
      };
    }
  }

  private createFallbackAnalysis(trip: IOptimizedTrip): ILLMAnalysis {
    return {
      reasoning: `Truck ${trip.truck.plateNumber} assigned based on capacity match and availability`,
      risks: [
        'Standard delivery delays possible',
        'Weather or traffic conditions may affect schedule',
        'Driver availability needs confirmation',
      ],
      alternatives: [
        'Reassign to alternative truck if needed',
        'Split load across multiple smaller trips',
        'Reschedule delivery window if required',
      ],
      confidence: trip.efficiency > 70 ? 75 : trip.efficiency > 50 ? 60 : 45,
    };
  }

  private createFallbackOverallAnalysis(trips: ISmartTrip[]): {
    overallStrategy: string;
    potentialImprovements: string[];
    riskAssessment: string;
  } {
    const avgEfficiency =
      trips.reduce((sum, trip) => sum + trip.efficiency, 0) / trips.length;

    return {
      overallStrategy: `Automated bin-packing optimization generated ${trips.length} trips with ${avgEfficiency.toFixed(1)}% average efficiency`,
      potentialImprovements: [
        'Review route optimization opportunities',
        'Consider trip consolidation where possible',
        'Implement real-time truck availability tracking',
      ],
      riskAssessment:
        avgEfficiency > 70
          ? 'Low risk - well-optimized plan'
          : 'Moderate risk - review recommended',
    };
  }

  private calculateOptimizationSummary(trips: ISmartTrip[]) {
    return {
      totalTrips: trips.length,
      averageEfficiency:
        trips.reduce((sum, trip) => sum + trip.efficiency, 0) / trips.length,
      totalEstimatedFuel: trips.reduce(
        (sum, trip) => sum + trip.estimatedFuel,
        0,
      ),
      totalEstimatedDuration: trips.reduce(
        (sum, trip) => sum + trip.estimatedDuration,
        0,
      ),
    };
  }
}
