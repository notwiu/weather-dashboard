// frontend/src/components/weather-dashboard.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { useToast } from '@/hooks/use-toast';

interface WeatherData {
  _id: string;
  timestamp: string;
  city: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  weather_condition: string;
  weather_description: string;
}

interface WeatherStats {
  current: WeatherData | null;
  average_temperature: number;
  max_temperature: number;
  min_temperature: number;
  trend: 'up' | 'down' | 'stable';
}

interface WeatherInsight {
  _id: string;
  insight: string;
  generated_at: string;
  weather_data: WeatherData;
}

export function WeatherDashboard() {
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [stats, setStats] = useState<WeatherStats | null>(null);
  const [insights, setInsights] = useState<WeatherInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchWeatherData();
    fetchInsights();
  }, []);

  const fetchWeatherData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/weather?limit=24', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const result = await response.json();
      setWeatherData(result.data);
      
      // Buscar estatísticas
      const statsResponse = await fetch('http://localhost:3000/api/weather/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const statsResult = await statsResponse.json();
      setStats(statsResult.data);
      
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados meteorológicos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/weather/insights', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setInsights(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
    }
  };

  const exportData = async (format: 'csv' | 'xlsx') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/weather/export/${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `weather-data.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: 'Sucesso',
          description: `Dados exportados em ${format.toUpperCase()}`,
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao exportar dados',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Meteorológico</h1>
          <p className="text-muted-foreground">
            Dados em tempo real de {stats?.current?.city || 'São Paulo'}
          </p>
        </div>
        <div className="space-x-2">
          <Button onClick={() => exportData('csv')}>Exportar CSV</Button>
          <Button onClick={() => exportData('xlsx')}>Exportar XLSX</Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temperatura Atual</CardTitle>
            <span>🌡️</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.current?.temperature ? `${stats.current.temperature}°C` : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              Sensação {stats?.current?.feels_like ? `${stats.current.feels_like}°C` : '--'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Umidade</CardTitle>
            <span>💧</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.current?.humidity ? `${stats.current.humidity}%` : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.current?.humidity && stats.current.humidity > 80 ? 'Alta umidade' : 'Normal'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vento</CardTitle>
            <span>💨</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.current?.wind_speed ? `${stats.current.wind_speed} m/s` : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.current?.wind_speed && stats.current.wind_speed > 5 ? 'Vento forte' : 'Leve'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Condição</CardTitle>
            <Badge variant="secondary">
              {stats?.current?.weather_condition || '--'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-sm capitalize">
              {stats?.current?.weather_description || '--'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos e Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Temperatura */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Variação de Temperatura (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weatherData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Line 
                  type="monotone" 
                  dataKey="temperature" 
                  stroke="#ff6b35" 
                  strokeWidth={2}
                  name="Temperatura"
                />
                <Line 
                  type="monotone" 
                  dataKey="feels_like" 
                  stroke="#4ecdc4" 
                  strokeWidth={2}
                  name="Sensação Térmica"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Insights de IA */}
        <Card>
          <CardHeader>
            <CardTitle>Insights de IA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.length > 0 ? (
                insights.map((insight) => (
                  <div key={insight._id} className="p-4 bg-muted rounded-lg">
                    <p className="text-sm">{insight.insight}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(insight.generated_at).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p>Nenhum insight disponível</p>
                  <p className="text-sm">Os insights são gerados automaticamente</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Umidade */}
      <Card>
        <CardHeader>
          <CardTitle>Umidade e Velocidade do Vento</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weatherData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleString()}
              />
              <Bar 
                yAxisId="left"
                dataKey="humidity" 
                fill="#8884d8" 
                name="Umidade (%)"
              />
              <Bar 
                yAxisId="right"
                dataKey="wind_speed" 
                fill="#82ca9d" 
                name="Vento (m/s)"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}