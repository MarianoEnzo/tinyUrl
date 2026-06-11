import { Injectable, NotFoundException } from '@nestjs/common';
import { EventRepository } from '../events/event.repository';
import { UrlRepository } from '../urls/url.repository';

@Injectable()
export class StatsService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly urlRepository: UrlRepository,
  ) {}

  async getStats(code: string) {
    const [urlExists, totalClicks] = await Promise.all([
      this.urlRepository.findByCode(code),
      this.eventRepository.count(code),
    ]);

    if (!urlExists) {
      throw new NotFoundException(`No se encontró la URL con código: ${code}`);
    }

    const lastClick =
      totalClicks > 0
        ? await this.eventRepository.findLastByCode(code)
        : null;

    return { code, totalClicks, lastClick: lastClick?.date ?? null };
  }
}
