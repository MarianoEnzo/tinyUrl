import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { UrlsModule } from '../urls/urls.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [EventsModule, UrlsModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
