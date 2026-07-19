const TMD_NWP_URL = "https://data.tmd.go.th/nwpapi/v1/forecast/location/daily/at";
const TMD_NWP_DOCS_URL = "https://data.tmd.go.th/nwpapi/doc/apidoc/location/forecast_daily.html";
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_DOCS_URL = "https://open-meteo.com/en/docs";

const DISTRICT_FORECAST_LOCATIONS = [
  { district: "Mae Sot District", latitude: 16.716, longitude: 98.571 },
  { district: "Umphang District", latitude: 16.017, longitude: 98.862 },
  { district: "Tha Song Yang District", latitude: 17.227, longitude: 98.225 },
  { district: "Mae Ramat District", latitude: 16.985, longitude: 98.516 },
  { district: "Phop Phra District", latitude: 16.384, longitude: 98.69 },
] as const;

export type DistrictCondition =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "overcast"
  | "fog"
  | "light-rain"
  | "moderate-rain"
  | "heavy-rain"
  | "thunderstorm"
  | "unknown";

export type TakDistrictForecastResult = {
  forecasts: Array<{
    district: string;
    latitude: number;
    longitude: number;
    days: Array<{
      date: string;
      maximumTemperatureC: number;
      minimumTemperatureC: number;
      rainChancePercent: number | null;
      precipitationMm: number;
      windSpeedKmh: number;
      windDirectionDegrees: number;
      humidityPercent: number | null;
      condition: DistrictCondition;
    }>;
  }>;
  source: {
    id: "tmd-nwp" | "open-meteo";
    name: string;
    shortName: string;
    sourceUrl: string;
    issuedAt: string;
    official: boolean;
  };
};

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function dateInBangkok() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function timestampInBangkok() {
  const value = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date()).replace(" ", "T");
  return `${value}+07:00`;
}

async function fetchWithTimeout(url: string, timeoutMs = 20_000, headers: HeadersInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", ...headers },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Forecast source returned ${response.status}`);
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function tmdCondition(code: number): DistrictCondition {
  if (code === 1) return "clear";
  if (code === 2) return "partly-cloudy";
  if (code === 3) return "cloudy";
  if (code === 4) return "overcast";
  if (code === 5) return "light-rain";
  if (code === 6) return "moderate-rain";
  if (code === 7) return "heavy-rain";
  if (code === 8) return "thunderstorm";
  return "unknown";
}

function wmoCondition(code: number): DistrictCondition {
  if (code === 0) return "clear";
  if (code <= 2) return "partly-cloudy";
  if (code === 3) return "overcast";
  if (code === 45 || code === 48) return "fog";
  if ([51, 53, 56, 61, 66, 80].includes(code)) return "light-rain";
  if ([55, 57, 63, 67, 81].includes(code)) return "moderate-rain";
  if ([65, 82].includes(code)) return "heavy-rain";
  if (code >= 95) return "thunderstorm";
  return "cloudy";
}

async function fetchTmdDistrictForecasts(token: string): Promise<TakDistrictForecastResult> {
  const date = dateInBangkok();
  const forecasts = await Promise.all(DISTRICT_FORECAST_LOCATIONS.map(async (location) => {
    const parameters = new URLSearchParams({
      lat: String(location.latitude),
      lon: String(location.longitude),
      fields: "tc_min,tc_max,rh,rain,ws10m,wd10m,cond",
      date,
      duration: "7",
    });
    const response = await fetchWithTimeout(
      `${TMD_NWP_URL}?${parameters}`,
      20_000,
      { Authorization: `Bearer ${token}` },
    );
    const json = await response.json() as any;
    const locationForecast = asArray<any>(json?.weather_forecast?.locations)[0];
    const days = asArray<any>(locationForecast?.forecasts).map((forecast) => ({
      date: String(forecast?.time ?? "").slice(0, 10),
      maximumTemperatureC: Number(forecast?.data?.tc_max ?? 0),
      minimumTemperatureC: Number(forecast?.data?.tc_min ?? 0),
      rainChancePercent: null,
      precipitationMm: Number(forecast?.data?.rain ?? 0),
      windSpeedKmh: Number(forecast?.data?.ws10m ?? 0) * 3.6,
      windDirectionDegrees: Number(forecast?.data?.wd10m ?? 0),
      humidityPercent: Number.isFinite(Number(forecast?.data?.rh)) ? Number(forecast.data.rh) : null,
      condition: tmdCondition(Number(forecast?.data?.cond ?? 0)),
    })).filter((day) => day.date);
    if (days.length === 0) throw new Error(`No TMD NWP forecast for ${location.district}`);
    return { ...location, days };
  }));

  return {
    forecasts,
    source: {
      id: "tmd-nwp",
      name: "Thai Meteorological Department NWP",
      shortName: "TMD NWP",
      sourceUrl: TMD_NWP_DOCS_URL,
      issuedAt: timestampInBangkok(),
      official: true,
    },
  };
}

async function fetchOpenMeteoDistrictForecasts(): Promise<TakDistrictForecastResult> {
  const parameters = new URLSearchParams({
    latitude: DISTRICT_FORECAST_LOCATIONS.map((location) => location.latitude).join(","),
    longitude: DISTRICT_FORECAST_LOCATIONS.map((location) => location.longitude).join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "wind_direction_10m_dominant",
    ].join(","),
    timezone: "Asia/Bangkok",
    forecast_days: "7",
  });
  const response = await fetchWithTimeout(`${OPEN_METEO_URL}?${parameters}`);
  const json = await response.json() as any;
  const locations = Array.isArray(json) ? json : [json];
  const forecasts = DISTRICT_FORECAST_LOCATIONS.map((location, locationIndex) => {
    const daily = locations[locationIndex]?.daily ?? {};
    const days = asArray<string>(daily.time).map((date, index) => ({
      date,
      maximumTemperatureC: Number(daily.temperature_2m_max?.[index] ?? 0),
      minimumTemperatureC: Number(daily.temperature_2m_min?.[index] ?? 0),
      rainChancePercent: Number.isFinite(Number(daily.precipitation_probability_max?.[index]))
        ? Number(daily.precipitation_probability_max[index])
        : null,
      precipitationMm: Number(daily.precipitation_sum?.[index] ?? 0),
      windSpeedKmh: Number(daily.wind_speed_10m_max?.[index] ?? 0),
      windDirectionDegrees: Number(daily.wind_direction_10m_dominant?.[index] ?? 0),
      humidityPercent: null,
      condition: wmoCondition(Number(daily.weather_code?.[index] ?? -1)),
    }));
    if (days.length === 0) throw new Error(`No point forecast for ${location.district}`);
    return { ...location, days };
  });

  return {
    forecasts,
    source: {
      id: "open-meteo",
      name: "Open-Meteo multi-model forecast",
      shortName: "Open-Meteo",
      sourceUrl: OPEN_METEO_DOCS_URL,
      issuedAt: timestampInBangkok(),
      official: false,
    },
  };
}

export async function fetchTakDistrictForecasts(): Promise<TakDistrictForecastResult> {
  const token = process.env.TMD_NWP_API_TOKEN?.trim();
  if (token) {
    try {
      return await fetchTmdDistrictForecasts(token);
    } catch (error) {
      console.error("TMD NWP district forecast unavailable; using point-model fallback", error);
    }
  }
  return fetchOpenMeteoDistrictForecasts();
}
