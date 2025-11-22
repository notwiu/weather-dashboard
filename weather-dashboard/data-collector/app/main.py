# data-collector/app/main.py
import os
import json
import time
import asyncio
import aio_pika
import httpx
from datetime import datetime
from typing import Dict, Any

class WeatherCollector:
    def __init__(self):
        self.api_key = os.getenv('OPENWEATHER_API_KEY')
        self.city = os.getenv('CITY', 'São Paulo')
        self.country_code = os.getenv('COUNTRY_CODE', 'BR')
        self.rabbitmq_url = os.getenv('RABBITMQ_URL')
        
    async def get_weather_data(self) -> Dict[str, Any]:
        """Coleta dados meteorológicos da OpenWeather"""
        url = "http://api.openweathermap.org/data/2.5/weather"
        params = {
            'q': f'{self.city},{self.country_code}',
            'appid': self.api_key,
            'units': 'metric',
            'lang': 'pt_br'
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'city': self.city,
                'country': self.country_code,
                'temperature': data['main']['temp'],
                'feels_like': data['main']['feels_like'],
                'humidity': data['main']['humidity'],
                'pressure': data['main']['pressure'],
                'wind_speed': data['wind']['speed'],
                'wind_direction': data['wind'].get('deg', 0),
                'weather_condition': data['weather'][0]['main'],
                'weather_description': data['weather'][0]['description'],
                'cloudiness': data['clouds']['all'],
                'visibility': data.get('visibility', 0),
                'sunrise': datetime.fromtimestamp(data['sys']['sunrise']).isoformat(),
                'sunset': datetime.fromtimestamp(data['sys']['sunset']).isoformat()
            }
    
    async def send_to_queue(self, data: Dict[str, Any]):
        """Envia dados para a fila RabbitMQ"""
        connection = await aio_pika.connect_robust(self.rabbitmq_url)
        
        async with connection:
            channel = await connection.channel()
            await channel.declare_queue('weather_data', durable=True)
            
            message = aio_pika.Message(
                body=json.dumps(data).encode(),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT
            )
            
            await channel.default_exchange.publish(
                message,
                routing_key='weather_data'
            )
            print(f"Dados enviados para a fila: {data['timestamp']}")
    
    async def collect_and_send(self):
        """Coleta e envia dados periodicamente"""
        try:
            weather_data = await self.get_weather_data()
            await self.send_to_queue(weather_data)
        except Exception as e:
            print(f"Erro na coleta de dados: {e}")

async def main():
    collector = WeatherCollector()
    
    while True:
        await collector.collect_and_send()
        # Coleta a cada hora
        await asyncio.sleep(3600)

if __name__ == "__main__":
    asyncio.run(main())