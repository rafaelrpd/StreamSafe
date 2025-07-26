'use client';

import { useEffect, useState } from "react";
import { getWeatherForecast } from "../services/weatherForecastService";

export default function WeatherForecast() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await getWeatherForecast();
        setData(result);
      } catch (err) {
        setError('Failed to fetch weather data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  if (!data || data.length === 0) return <p>No weather data available</p>;

  return (
    <div>
      <h1>Weather Forecast</h1>
      <ul>
        {data.map((forecast: any, index: number) => (
          <li key={index}>
            <strong>{forecast.Date}</strong>: {forecast.TemperatureC}°C, {forecast.Summary}
          </li>
        ))}
      </ul>
    </div>
  );
}