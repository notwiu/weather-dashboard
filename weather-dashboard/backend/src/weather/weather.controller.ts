// backend/src/weather/weather.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { WeatherService } from './weather.service';
import { OpenAIService } from '../ai/openai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateWeatherDto } from './dto/create-weather.dto';
import { WeatherQueryDto } from './dto/weather-query.dto';
import * as ExcelJS from 'exceljs';

@Controller('api/weather')
export class WeatherController {
  constructor(
    private readonly weatherService: WeatherService,
    private readonly openAIService: OpenAIService,
  ) {}

  @Post()
  async create(@Body() createWeatherDto: CreateWeatherDto) {
    const weather = await this.weatherService.create(createWeatherDto);
    
    // Gera insights automaticamente para novos dados
    await this.openAIService.generateWeatherInsights(weather);
    
    return {
      success: true,
      data: weather,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() query: WeatherQueryDto) {
    const { data, total } = await this.weatherService.findAll(query);
    return {
      success: true,
      data,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Query('city') city?: string) {
    const stats = await this.weatherService.getWeatherStats(city);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('insights')
  @UseGuards(JwtAuthGuard)
  async getInsights(@Query('city') city?: string) {
    const insights = await this.openAIService.getLatestInsights(city);
    return {
      success: true,
      data: insights,
    };
  }

  @Get('export/csv')
  @UseGuards(JwtAuthGuard)
  async exportCSV(@Res() res: Response, @Query() query: WeatherQueryDto) {
    const data = await this.weatherService.findAllForExport(query);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=weather-data.csv');
    
    // Cabeçalho CSV
    res.write('Date,City,Country,Temperature,Humidity,Wind Speed,Condition\n');
    
    data.forEach(item => {
      res.write(
        `"${item.timestamp}","${item.city}","${item.country}",${item.temperature},${item.humidity},${item.wind_speed},"${item.weather_condition}"\n`
      );
    });
    
    res.end();
  }

  @Get('export/xlsx')
  @UseGuards(JwtAuthGuard)
  async exportXLSX(@Res() res: Response, @Query() query: WeatherQueryDto) {
    const data = await this.weatherService.findAllForExport(query);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Weather Data');

    // Cabeçalhos
    worksheet.columns = [
      { header: 'Date', key: 'timestamp', width: 20 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'Country', key: 'country', width: 15 },
      { header: 'Temperature (°C)', key: 'temperature', width: 15 },
      { header: 'Feels Like (°C)', key: 'feels_like', width: 15 },
      { header: 'Humidity (%)', key: 'humidity', width: 15 },
      { header: 'Wind Speed (m/s)', key: 'wind_speed', width: 15 },
      { header: 'Condition', key: 'weather_condition', width: 20 },
    ];

    // Dados
    data.forEach(item => {
      worksheet.addRow(item);
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=weather-data.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }
}