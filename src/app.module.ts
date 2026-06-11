import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UrlsModule } from './urls/urls.module';
import { EventsModule } from './events/events.module';
import { StatsModule } from './stats/stats.module';
import { RedisModule } from './redis.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI ?? 'mongodb://localhost:27017/tinyurl',
    ),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    RedisModule,
    UrlsModule,
    EventsModule,
    StatsModule,
  ],
})
export class AppModule {}
