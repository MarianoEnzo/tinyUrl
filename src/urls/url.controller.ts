import { Controller, Post, Get, Param, Body, Res, Req } from '@nestjs/common';
import type { Response, Request } from 'express';
import { UrlService } from './url.service';
import { CreateUrlDto } from './dto/create-url.dto';

@Controller()
export class UrlController {
  constructor(private readonly urlService: UrlService) {}

  @Post()
  async shorten(@Body() dto: CreateUrlDto) {
    return this.urlService.create(dto.originalUrl, dto.alias);
  }

  @Get(':code')
  async redirect(
    @Param('code') code: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const url = await this.urlService.resolve(code, ip, userAgent);
    return res.redirect(url);
  }
}
