// backend/src/weather/schemas/weather.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Weather extends Document {
  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  country: string;

  @Prop({ required: true })
  temperature: number;

  @Prop({ required: true })
  feels_like: number;

  @Prop({ required: true })
  humidity: number;

  @Prop({ required: true })
  pressure: number;

  @Prop({ required: true })
  wind_speed: number;

  @Prop({ default: 0 })
  wind_direction: number;

  @Prop({ required: true })
  weather_condition: string;

  @Prop({ required: true })
  weather_description: string;

  @Prop({ default: 0 })
  cloudiness: number;

  @Prop({ default: 0 })
  visibility: number;

  @Prop()
  sunrise: Date;

  @Prop()
  sunset: Date;
}

export const WeatherSchema = SchemaFactory.createForClass(Weather);

// Index para consultas eficientes
WeatherSchema.index({ city: 1, timestamp: -1 });
WeatherSchema.index({ timestamp: -1 });