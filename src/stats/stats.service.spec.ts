import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StatsService } from './stats.service';
import { EventRepository } from '../events/event.repository';
import { UrlRepository } from '../urls/url.repository';

const mockEventRepository = {
  count: jest.fn(),
  findLastByCode: jest.fn(),
};

const mockUrlRepository = {
  findByCode: jest.fn(),
};

describe('StatsService', () => {
  let service: StatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: EventRepository, useValue: mockEventRepository },
        { provide: UrlRepository, useValue: mockUrlRepository },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('retorna totalClicks y lastClick para un código con eventos', async () => {
      const lastClickDate = new Date('2026-06-11T19:17:00Z');
      mockUrlRepository.findByCode.mockResolvedValue({ code: 'AbC123' });
      mockEventRepository.count.mockResolvedValue(5);
      mockEventRepository.findLastByCode.mockResolvedValue({
        date: lastClickDate,
      });

      const result = await service.getStats('AbC123');

      expect(result).toEqual({
        code: 'AbC123',
        totalClicks: 5,
        lastClick: lastClickDate,
      });
    });

    it('retorna totalClicks 0 y lastClick null si la URL existe pero nunca fue clickeada', async () => {
      mockUrlRepository.findByCode.mockResolvedValue({ code: 'AbC123' });
      mockEventRepository.count.mockResolvedValue(0);

      const result = await service.getStats('AbC123');

      expect(result).toEqual({ code: 'AbC123', totalClicks: 0, lastClick: null });
      expect(mockEventRepository.findLastByCode).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el código no existe', async () => {
      mockUrlRepository.findByCode.mockResolvedValue(null);
      mockEventRepository.count.mockResolvedValue(0);

      await expect(service.getStats('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
