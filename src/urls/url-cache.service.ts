import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

const TTL_SECONDS = 3600;

@Injectable()
export class UrlCacheService {
  constructor(@Inject('REDIS_CLIENT') private readonly cache: Redis) {}

  async get(code: string): Promise<string | null> {
    return this.cache.get(code);
  }

  async set(code: string, url: string): Promise<void> {
    await this.cache.set(code, url, 'EX', TTL_SECONDS);
  }
}
