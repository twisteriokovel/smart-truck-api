import { Controller, Get, Query } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import {
  YearlyChartsQueryDto,
  MonthlySummaryResponseDto,
  YearlyChartsResponseDto,
} from './dto/statistics.dto';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('monthly-summary')
  async getMonthlySummary(): Promise<MonthlySummaryResponseDto> {
    return this.statisticsService.getMonthlySummary();
  }

  @Get('yearly-charts')
  async getYearlyChartsData(
    @Query() query: YearlyChartsQueryDto,
  ): Promise<YearlyChartsResponseDto> {
    return this.statisticsService.getYearlyChartsData(query.year);
  }
}
