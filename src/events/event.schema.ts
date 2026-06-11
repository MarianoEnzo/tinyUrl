import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EventDocument = HydratedDocument<Event>;

@Schema()
export class Event {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  date: Date;

  @Prop()
  ip: string;

  @Prop()
  userAgent: string;
}

export const EventSchema = SchemaFactory.createForClass(Event);
