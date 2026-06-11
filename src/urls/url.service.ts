import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { UrlRepository } from './url.repository';
import { UrlCacheService } from './url-cache.service';

@Injectable()
export class UrlService {
  constructor(
    private readonly urlRepository: UrlRepository,
    private readonly urlCache: UrlCacheService,
    @InjectQueue('access-events') private accessQueue: Queue,
  ) {}

  async create(original: string, alias?: string) {
    let code = alias || nanoid(10);
    let found = await this.urlRepository.findByCode(code);
    if (found && alias) {
      throw new ConflictException('El alias ya existe');
    }
    while (found) {
      code = nanoid(10);
      found = await this.urlRepository.findByCode(code);
    }
    await this.urlRepository.create(original, code);
    return { code };
  }

  async resolve(code: string, ip?: string, userAgent?: string) {
    const url = await this.getUrl(code);
    await this.accessQueue.add('url-accessed', {
      code,
      date: new Date(),
      ip,
      userAgent,
    });
    return url;
  }

  private async getUrl(code: string): Promise<string> {
    const cacheHit = await this.urlCache.get(code);
    if (cacheHit) return cacheHit;

    const found = await this.urlRepository.findByCode(code);
    if (!found) throw new NotFoundException('Url no encontrada');

    await this.urlCache.set(code, found.originalUrl);
    return found.originalUrl;
  }
}
