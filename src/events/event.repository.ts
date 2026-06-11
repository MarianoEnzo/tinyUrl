import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from './event.schema';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventRepository {
  constructor(
    @InjectModel(Event.name) private EventModel: Model<EventDocument>,
  ) {}

  async create(dto: CreateEventDto): Promise<void> {
    await this.EventModel.create(dto);
  }
  async count(code: string): Promise<number> {
    return this.EventModel.countDocuments({ code });
  }

  async findLastByCode(code: string) {
    const found = await this.EventModel.findOne({ code }).sort({
      date: -1,
    });
    return found;
  }
}
