import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Url, UrlSchema } from './url.schema';
import { RedisModule } from 'src/redis.module';
import { UrlController } from './url.controller';
import { UrlService } from './url.service';
import { BullModule } from '@nestjs/bullmq';
import { UrlCacheService } from './url-cache.service';
import { UrlRepository } from './url.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Url.name, schema: UrlSchema }]),
    RedisModule,
    BullModule.registerQueue({
      name: 'access-events',
    }),
  ],
  controllers: [UrlController],
  providers: [UrlService, UrlCacheService, UrlRepository],
  exports: [UrlRepository],
})
export class UrlsModule {}
