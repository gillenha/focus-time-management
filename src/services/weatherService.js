const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const searchLocations = async (query) => {
  const response = await fetch(`${API_URL}/api/weather/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error(`Error ${response.status}`);
  const results = await response.json();
  return results.map((r) => ({
    display: [r.name, r.state, r.country].filter(Boolean).join(', '),
    lat: r.lat,
    lon: r.lon,
  }));
};

export const fetchWeather = async (lat, lon, unit = 'F') => {
  const units = unit === 'F' ? 'imperial' : 'metric';
  const response = await fetch(`${API_URL}/api/weather?lat=${lat}&lon=${lon}&units=${units}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Error ${response.status}`);
  }
  return response.json();
};

export const getWeatherIconKey = (weatherId) => {
  if (weatherId >= 200 && weatherId < 300) return 'thunderstorm';
  if (weatherId >= 300 && weatherId < 600) return 'rain';
  if (weatherId >= 600 && weatherId < 700) return 'snow';
  if (weatherId >= 700 && weatherId < 800) return 'atmosphere';
  if (weatherId === 800) return 'clear';
  if (weatherId === 801) return 'partlyCloudy';
  if (weatherId > 801) return 'cloudy';
  return 'cloudy';
};
