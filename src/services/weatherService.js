const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

export const fetchWeatherByZip = async (zipCode, unit = 'F') => {
  const apiKey = process.env.REACT_APP_OPENWEATHER_API_KEY;
  const units = unit === 'F' ? 'imperial' : 'metric';
  const response = await fetch(
    `${BASE_URL}?zip=${zipCode},us&appid=${apiKey}&units=${units}`
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Error ${response.status}`);
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
