import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UrlDocument = HydratedDocument<Url>;

@Schema()
export class Url {
  @Prop({ required: true })
  originalUrl: string;

  @Prop({ required: true, unique: true })
  code: string;
}

export const UrlSchema = SchemaFactory.createForClass(Url);
