import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './event.schema';
import { EventsWorker } from './event.worker';
import { BullModule } from '@nestjs/bullmq';
import { EventRepository } from './event.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    BullModule.registerQueue({ name: 'access-events' }),
  ],
  providers: [EventsWorker, EventRepository],
  exports: [EventRepository],
})
export class EventsModule {}
