import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Url, UrlDocument } from './url.schema';

@Injectable()
export class UrlRepository {
  constructor(@InjectModel(Url.name) private urlModel: Model<UrlDocument>) {}

  async findByCode(code: string): Promise<UrlDocument | null> {
    return this.urlModel.findOne({ code });
  }

  async create(originalUrl: string, code: string): Promise<void> {
    await this.urlModel.create({ originalUrl, code });
  }
}
