// backend/src/ai/openai.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Weather } from '../weather/schemas/weather.schema';
import { WeatherInsight, WeatherInsightSchema } from './schemas/insight.schema';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private openai: OpenAI;

  constructor(
    @InjectModel(Weather.name) private weatherModel: Model<Weather>,
    @InjectModel('WeatherInsight') private insightModel: Model<WeatherInsight>,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateWeatherInsights(weatherData: Weather): Promise<void> {
    try {
      // Busca dados recentes para contexto
      const recentData = await this.weatherModel
        .find({
          city: weatherData.city,
          timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        })
        .sort({ timestamp: -1 })
        .limit(24)
        .exec();

      const prompt = this.buildInsightPrompt(weatherData, recentData);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a meteorological expert. Provide concise, accurate weather insights in Portuguese.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
      });

      const insightText = completion.choices[0].message.content;
      
      // Salva o insight
      await this.insightModel.create({
        city: weatherData.city,
        insight: insightText,
        weather_data: weatherData._id,
        generated_at: new Date(),
      });

    } catch (error) {
      console.error('Error generating AI insights:', error);
      // Fallback para insights básicos sem IA
      await this.generateBasicInsights(weatherData);
    }
  }

  private buildInsightPrompt(current: Weather, historical: Weather[]): string {
    return `
Analise os dados meteorológicos atuais e históricos e forneça insights úteis:

DADOS ATUAIS:
- Cidade: ${current.city}
- Temperatura: ${current.temperature}°C
- Sensação térmica: ${current.feels_like}°C
- Umidade: ${current.humidity}%
- Velocidade do vento: ${current.wind_speed} m/s
- Condição: ${current.weather_condition}
- Descrição: ${current.weather_description}

DADOS HISTÓRICOS (últimos 7 dias):
${historical.map(data => 
  `- ${data.timestamp}: ${data.temperature}°C, ${data.humidity}% umidade, ${data.weather_condition}`
).join('\n')}

Forneça:
1. Análise da condição atual
2. Tendências observadas
3. Recomendações (roupas, atividades, etc.)
4. Alertas se necessário

Resposta em português, formato claro e conciso.
    `;
  }

  private async generateBasicInsights(weatherData: Weather): Promise<void> {
    let insight = '';
    
    if (weatherData.temperature > 30) {
      insight = '🌡️ Temperatura elevada. Recomenda-se hidratação constante e roupas leves.';
    } else if (weatherData.temperature < 15) {
      insight = '🧥 Temperatura baixa. Ideal usar agasalhos e se proteger do frio.';
    } else {
      insight = '😊 Clima agradável. Ótimo para atividades ao ar livre.';
    }

    if (weatherData.humidity > 80) {
      insight += ' 💧 Alta umidade. Pode causar desconforto térmico.';
    }

    if (weatherData.weather_condition.toLowerCase().includes('rain')) {
      insight += ' ☔ Chuva prevista. Leve guarda-chuva e evite áreas alagadas.';
    }

    await this.insightModel.create({
      city: weatherData.city,
      insight,
      weather_data: weatherData._id,
      generated_at: new Date(),
    });
  }

  async getLatestInsights(city?: string): Promise<WeatherInsight[]> {
    const filter = city ? { city } : {};
    return this.insightModel
      .find(filter)
      .sort({ generated_at: -1 })
      .limit(5)
      .populate('weather_data')
      .exec();
  }
}