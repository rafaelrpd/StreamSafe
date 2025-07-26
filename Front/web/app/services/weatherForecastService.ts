import { apiService } from "./apiService";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL) {
    throw new Error("API URL is not defined");
  }

export async function getWeatherForecast() {  
  return await apiService.get(`${API_URL}/weatherforecast/`);
}