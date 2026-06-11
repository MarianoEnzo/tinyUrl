import { Controller, Get, Param } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('api/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get(':code')
  async getStats(@Param('code') code: string) {
    return this.statsService.getStats(code);
  }
}
