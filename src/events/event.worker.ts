import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EventRepository } from './event.repository';
import { CreateEventDto } from './dto/create-event.dto';

@Processor('access-events')
export class EventsWorker extends WorkerHost {
  constructor(private eventRepository: EventRepository) {
    super();
  }

  async process(job: Job<CreateEventDto>) {
    await this.eventRepository.create(job.data);
  }
}
