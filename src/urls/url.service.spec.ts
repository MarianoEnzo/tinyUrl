import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { UrlService } from './url.service';
import { UrlRepository } from './url.repository';
import { UrlCacheService } from './url-cache.service';

jest.mock('nanoid', () => ({ nanoid: jest.fn(() => 'mockedcode1') }));

const mockUrlRepository = {
  findByCode: jest.fn(),
  create: jest.fn(),
};

const mockUrlCache = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockQueue = {
  add: jest.fn(),
};

describe('UrlService', () => {
  let service: UrlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlService,
        { provide: UrlRepository, useValue: mockUrlRepository },
        { provide: UrlCacheService, useValue: mockUrlCache },
        { provide: getQueueToken('access-events'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<UrlService>(UrlService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('genera un código cuando no se pasa alias', async () => {
      mockUrlRepository.findByCode.mockResolvedValue(null);
      mockUrlRepository.create.mockResolvedValue(undefined);

      const result = await service.create('https://google.com');

      expect(result.code).toBe('mockedcode1');
      expect(mockUrlRepository.create).toHaveBeenCalledWith(
        'https://google.com',
        'mockedcode1',
      );
    });

    it('usa el alias cuando se proporciona', async () => {
      mockUrlRepository.findByCode.mockResolvedValue(null);

      const result = await service.create('https://google.com', 'mi-alias');

      expect(result.code).toBe('mi-alias');
    });

    it('lanza ConflictException si el alias ya existe', async () => {
      mockUrlRepository.findByCode.mockResolvedValue({ code: 'mi-alias' });

      await expect(
        service.create('https://google.com', 'mi-alias'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('resolve', () => {
    it('retorna la URL desde caché y emite evento a la cola', async () => {
      mockUrlCache.get.mockResolvedValue('https://google.com');

      const url = await service.resolve('AbC123', '127.0.0.1', 'Mozilla/5.0');

      expect(url).toBe('https://google.com');
      expect(mockUrlRepository.findByCode).not.toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledWith(
        'url-accessed',
        expect.objectContaining({ code: 'AbC123', ip: '127.0.0.1' }),
      );
    });

    it('busca en MongoDB si no está en caché, guarda en caché y emite evento', async () => {
      mockUrlCache.get.mockResolvedValue(null);
      mockUrlRepository.findByCode.mockResolvedValue({
        originalUrl: 'https://google.com',
      });

      const url = await service.resolve('AbC123');

      expect(url).toBe('https://google.com');
      expect(mockUrlCache.set).toHaveBeenCalledWith('AbC123', 'https://google.com');
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('lanza NotFoundException si el código no existe', async () => {
      mockUrlCache.get.mockResolvedValue(null);
      mockUrlRepository.findByCode.mockResolvedValue(null);

      await expect(service.resolve('inexistente')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });
});
