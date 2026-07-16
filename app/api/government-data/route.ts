import { parse as parseCsv } from "csv-parse/sync";
import { XMLParser } from "fast-xml-parser";
import { fetchTakProvinceForecast } from "../../lib/takProvinceForecast";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCES = {
  tmd: {
    name: "Thai Meteorological Department",
    shortName: "TMD",
    observationUrl: "https://data.tmd.go.th/api/Weather3Hours/V2/?uid=api&ukey=api12345",
    publicUrl: "https://data.tmd.go.th/dataset/index.php",
    nwpUrl: "https://data.tmd.go.th/nwpapi/v1/forecast/location/daily/at",
    nwpDocsUrl: "https://data.tmd.go.th/nwpapi/doc/apidoc/location/forecast_daily.html",
  },
  pointForecast: {
    name: "Open-Meteo multi-model forecast",
    shortName: "Open-Meteo",
    url: "https://api.open-meteo.com/v1/forecast",
    publicUrl: "https://open-meteo.com/en/docs",
  },
  water: {
    name: "National Hydroinformatics Data Center",
    shortName: "ThaiWater",
    waterUrl: "https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load",
    rainUrl: "https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h",
    publicUrl: "https://www.thaiwater.net/",
  },
  roads: {
    name: "Department of Rural Roads",
    shortName: "DRR",
    url: "https://dataportal.drr.go.th/dataset/187480f0-45e9-433f-9964-909cab4f5289/resource/a87bcef5-c3c6-4c0b-b86b-5fc2f1934277/download/flood.json",
    publicUrl: "https://datagov.mot.go.th/dataset/fms2_flood",
  },
  ddpm: {
    name: "Department of Disaster Prevention and Mitigation",
    shortName: "DDPM",
    metadataUrl: "https://catalog.disaster.go.th/api/3/action/package_show?id=dpm-gd002",
    publicUrl: "https://catalog.disaster.go.th/dataset/dpm-gd002",
  },
  population: {
    name: "Department of Provincial Administration",
    shortName: "DOPA",
    dataUrl: "https://stat.bora.dopa.go.th/new_stat/file/69/2_6906.xls",
    publicUrl: "https://stat.bora.dopa.go.th/new_stat/webPage/statByMooBan.php?month=06&year=69",
  },
} as const;

const REGISTERED_POPULATION = [
  { district: "Mae Sot District", population: 180_834 },
  { district: "Umphang District", population: 54_049 },
  { district: "Tha Song Yang District", population: 102_587 },
  { district: "Mae Ramat District", population: 60_532 },
  { district: "Phop Phra District", population: 102_526 },
] as const;

const TARGET_DISTRICTS_EN = new Set([
  "Mae Sot District",
  "Umphang District",
  "Tha Song Yang District",
  "Mae Ramat District",
  "Phop Phra District",
]);

const TARGET_DISTRICTS_TH = new Set(["แม่สอด", "อุ้มผาง", "ท่าสองยาง", "แม่ระมาด", "พบพระ"]);

const TARGET_TMD_STATIONS = new Set(["MAE SOT", "UMPHANG"]);

const DISTRICT_FORECAST_LOCATIONS = [
  { district: "Mae Sot District", latitude: 16.716, longitude: 98.571 },
  { district: "Umphang District", latitude: 16.017, longitude: 98.862 },
  { district: "Tha Song Yang District", latitude: 17.227, longitude: 98.225 },
  { district: "Mae Ramat District", latitude: 16.985, longitude: 98.516 },
  { district: "Phop Phra District", latitude: 16.384, longitude: 98.69 },
] as const;

type DistrictCondition =
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

type DistrictForecastDay = {
  date: string;
  maximumTemperatureC: number;
  minimumTemperatureC: number;
  rainChancePercent: number | null;
  precipitationMm: number;
  windSpeedKmh: number;
  windDirectionDegrees: number;
  humidityPercent: number | null;
  condition: DistrictCondition;
};

type DistrictForecast = {
  district: string;
  latitude: number;
  longitude: number;
  days: DistrictForecastDay[];
};

type DistrictForecastResult = {
  forecasts: DistrictForecast[];
  source: {
    id: "tmd-nwp" | "open-meteo";
    name: string;
    shortName: string;
    sourceUrl: string;
    issuedAt: string;
    official: boolean;
  };
};

async function fetchWithTimeout(url: string, timeoutMs = 15_000, headers: HeadersInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json, application/xml, text/csv;q=0.9, */*;q=0.8", ...headers },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function stationName(item: Record<string, any>) {
  return (
    item?.station?.tele_station_name?.en ||
    item?.station?.tele_station_name?.th ||
    item?.station?.tele_station_oldcode ||
    "Unnamed station"
  );
}

function xmlValue(value: any) {
  return value && typeof value === "object" && "#text" in value ? value["#text"] : value;
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

async function getTmdDistrictForecasts(token: string): Promise<DistrictForecastResult> {
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
      `${SOURCES.tmd.nwpUrl}?${parameters}`,
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
      sourceUrl: SOURCES.tmd.nwpDocsUrl,
      issuedAt: timestampInBangkok(),
      official: true,
    },
  };
}

async function getOpenMeteoDistrictForecasts(): Promise<DistrictForecastResult> {
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
  const response = await fetchWithTimeout(`${SOURCES.pointForecast.url}?${parameters}`, 20_000);
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
      name: SOURCES.pointForecast.name,
      shortName: SOURCES.pointForecast.shortName,
      sourceUrl: SOURCES.pointForecast.publicUrl,
      issuedAt: timestampInBangkok(),
      official: false,
    },
  };
}

async function getDistrictForecasts(): Promise<DistrictForecastResult> {
  const token = process.env.TMD_NWP_API_TOKEN?.trim();
  if (token) {
    try {
      return await getTmdDistrictForecasts(token);
    } catch (error) {
      console.error("TMD NWP district forecast unavailable; using point-model fallback", error);
    }
  }
  return getOpenMeteoDistrictForecasts();
}

async function getWeather() {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const [observationResult, forecastResult, districtForecastResult] = await Promise.allSettled([
    fetchWithTimeout(SOURCES.tmd.observationUrl),
    fetchTakProvinceForecast(),
    getDistrictForecasts(),
  ]);

  if (observationResult.status === "rejected" && forecastResult.status === "rejected" && districtForecastResult.status === "rejected") {
    throw new Error("TMD observation and forecast feeds unavailable");
  }

  let stations: Array<{
    code: string;
    name: string;
    observedAt: string;
    temperatureC: number;
    humidityPercent: number;
    rainfallMm: number;
    rainfall24hMm: number;
    windSpeedKmh: number;
    latitude: number;
    longitude: number;
  }> = [];

  if (observationResult.status === "fulfilled") {
    const xml = (await observationResult.value.text()).replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
    const parsed = parser.parse(xml);
    const stationNodes = asArray(parsed?.Weather3Hours?.Stations?.Station ?? parsed?.Weather3Hours?.Station);

    stations = stationNodes
      .filter((station: any) => station?.Province === "ตาก" && TARGET_TMD_STATIONS.has(String(station?.StationNameEnglish ?? "")))
      .map((station: any) => ({
        code: String(xmlValue(station.WmoStationNumber) ?? ""),
        name: String(station.StationNameEnglish ?? station.StationNameThai ?? "TMD station"),
        observedAt: String(station.Observation?.DateTime ?? ""),
        temperatureC: Number(xmlValue(station.Observation?.AirTemperature) ?? 0),
        humidityPercent: Number(xmlValue(station.Observation?.RelativeHumidity) ?? 0),
        rainfallMm: Number(xmlValue(station.Observation?.Rainfall) ?? 0),
        rainfall24hMm: Number(xmlValue(station.Observation?.Rainfall24Hr) ?? 0),
        windSpeedKmh: Number(xmlValue(station.Observation?.WindSpeed) ?? 0),
        latitude: Number(xmlValue(station.Latitude) ?? 0),
        longitude: Number(xmlValue(station.Longitude) ?? 0),
      }))
      .sort((a: any, b: any) => b.rainfall24hMm - a.rainfall24hMm);
  }

  const forecast = forecastResult.status === "fulfilled" ? forecastResult.value : null;

  return {
    stations,
    observedAt: stations[0]?.observedAt ?? null,
    forecast,
    districtForecasts: districtForecastResult.status === "fulfilled" ? districtForecastResult.value.forecasts : [],
    districtForecastSource: districtForecastResult.status === "fulfilled" ? districtForecastResult.value.source : null,
    sourceUrl: SOURCES.tmd.publicUrl,
  };
}

async function getWater() {
  const [waterResponse, rainResponse] = await Promise.all([
    fetchWithTimeout(SOURCES.water.waterUrl, 20_000),
    fetchWithTimeout(SOURCES.water.rainUrl, 20_000),
  ]);
  const [waterJson, rainJson] = await Promise.all([waterResponse.json(), rainResponse.json()]);

  const waterStations = asArray<any>((waterJson as any)?.waterlevel_data?.data)
    .filter((item) => item?.geocode?.province_code === "63" && TARGET_DISTRICTS_EN.has(String(item?.geocode?.amphoe_name?.en ?? "")))
    .map((item) => ({
      id: String(item.id),
      code: String(item?.station?.tele_station_oldcode ?? item.id),
      name: stationName(item),
      district: String(item?.geocode?.amphoe_name?.en ?? item?.geocode?.amphoe_name?.th ?? "Tak"),
      river: String(item?.river_name ?? "Watercourse"),
      observedAt: String(item?.waterlevel_datetime ?? ""),
      levelMsl: Number(item?.waterlevel_msl ?? 0),
      previousLevelMsl: Number(item?.waterlevel_msl_previous ?? item?.waterlevel_msl ?? 0),
      bankDistanceM: Number(item?.diff_wl_bank ?? 0),
      bankDistanceText: String(item?.diff_wl_bank_text ?? ""),
      situationLevel: Number(item?.situation_level ?? 0),
      storagePercent: Number(item?.storage_percent ?? 0),
      latitude: Number(item?.station?.tele_station_lat ?? 0),
      longitude: Number(item?.station?.tele_station_long ?? 0),
      agency: String(item?.agency?.agency_shortname?.en ?? item?.agency?.agency_name?.en ?? "Government station"),
    }))
    .sort((a, b) => b.situationLevel - a.situationLevel || a.bankDistanceM - b.bankDistanceM);

  const rainfallStations = asArray<any>((rainJson as any)?.data)
    .filter((item) => item?.geocode?.province_code === "63" && TARGET_DISTRICTS_EN.has(String(item?.geocode?.amphoe_name?.en ?? "")))
    .map((item) => ({
      id: String(item.id),
      code: String(item?.station?.tele_station_oldcode ?? item.id),
      name: stationName(item),
      district: String(item?.geocode?.amphoe_name?.en ?? item?.geocode?.amphoe_name?.th ?? "Tak"),
      observedAt: String(item?.rainfall_datetime ?? ""),
      rainfall1hMm: Number(item?.rain_1h ?? 0),
      rainfall24hMm: Number(item?.rain_24h ?? 0),
      latitude: Number(item?.station?.tele_station_lat ?? 0),
      longitude: Number(item?.station?.tele_station_long ?? 0),
      agency: String(item?.agency?.agency_shortname?.en ?? item?.agency?.agency_name?.en ?? "Government station"),
    }))
    .sort((a, b) => b.rainfall24hMm - a.rainfall24hMm);

  return {
    stations: waterStations,
    rainfallStations,
    flaggedCount: waterStations.filter((station) => station.situationLevel >= 4).length,
    observedAt: waterStations[0]?.observedAt ?? rainfallStations[0]?.observedAt ?? null,
    sourceUrl: SOURCES.water.publicUrl,
  };
}

async function getRoadArchive() {
  const response = await fetchWithTimeout(SOURCES.roads.url, 25_000);
  const bytes = await response.arrayBuffer();
  const json = JSON.parse(new TextDecoder("utf-8").decode(bytes));
  const records = Array.isArray(json)
    ? json
    : ((Object.values(json).find((value) => Array.isArray(value)) as any[]) ?? []);
  const takRecords = records
    .filter((record) => {
      if (String(record.PROVINCE ?? "").trim() !== "ตาก") return false;
      const locationText = `${record.TITLE ?? ""} ${record.DESCRIPTION ?? ""}`;
      return Array.from(TARGET_DISTRICTS_TH).some((district) => locationText.includes(district));
    })
    .map((record) => ({
      id: String(record.ID ?? record.FLOOD_ID ?? ""),
      title: String(record.TITLE ?? "Road flood record"),
      road: String(record.ROAD ?? ""),
      date: String(record.DATE ?? ""),
      passable: String(record.CANPASS ?? "").toLowerCase() === "t",
      floodHeightCm: Number(record.FLOOD_HEIGHT ?? 0),
      latitude: Number(record.LATITUDE ?? 0),
      longitude: Number(record.LONGITUDE ?? 0),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    records: takRecords.slice(0, 10),
    recordCount: takRecords.length,
    blockedCount: takRecords.filter((record) => !record.passable).length,
    archiveYear: 2022,
    sourceUrl: SOURCES.roads.publicUrl,
  };
}

async function getDdpmPreparedness() {
  const metadataResponse = await fetchWithTimeout(SOURCES.ddpm.metadataUrl);
  const metadata = await metadataResponse.json() as any;
  const csvResource = asArray<any>(metadata?.result?.resources).find(
    (resource) => String(resource?.format ?? "").toUpperCase() === "CSV",
  );
  if (!csvResource?.url) throw new Error("DDPM CSV resource unavailable");

  const csvResponse = await fetchWithTimeout(csvResource.url, 20_000);
  const csvBytes = await csvResponse.arrayBuffer();
  const csvText = new TextDecoder("utf-8").decode(csvBytes);
  const rows = parseCsv(csvText, {
    bom: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as string[][];
  const takRows = rows.slice(1).filter(
    (row) => String(row[2] ?? "").trim() === "ตาก" && TARGET_DISTRICTS_TH.has(String(row[3] ?? "").trim()),
  );
  const districtCounts = new Map<string, number>();
  let totalCapacity = 0;

  for (const row of takRows) {
    const district = String(row[3] ?? "Unknown").trim();
    districtCounts.set(district, (districtCounts.get(district) ?? 0) + 1);
    totalCapacity += Number(String(row[7] ?? "0").replace(/,/g, "")) || 0;
  }

  return {
    shelterCount: takRows.length,
    totalCapacity,
    districts: Array.from(districtCounts, ([district, count]) => ({ district, count })),
    datasetUpdatedAt: String(csvResource.last_modified ?? metadata?.result?.metadata_modified ?? ""),
    sourceUrl: SOURCES.ddpm.publicUrl,
  };
}

function getPopulationScreening(water: Awaited<ReturnType<typeof getWater>> | null) {
  const flaggedDistricts = new Set(
    (water?.stations ?? [])
      .filter((station) => station.situationLevel >= 4)
      .map((station) => station.district),
  );
  const districts = REGISTERED_POPULATION.map((district) => ({
    ...district,
    screenedAsExposed: flaggedDistricts.has(district.district),
  }));

  return {
    districts,
    totalTargetPopulation: districts.reduce((total, district) => total + district.population, 0),
    exposedScreeningPopulation: water
      ? districts.filter((district) => district.screenedAsExposed).reduce((total, district) => total + district.population, 0)
      : null,
    flaggedDistrictCount: flaggedDistricts.size,
    referencePeriod: "June 2026",
    methodology: "Registered population in target districts containing at least one ThaiWater situation level 4-5 gauge.",
    sourceUrl: SOURCES.population.publicUrl,
    downloadUrl: SOURCES.population.dataUrl,
  };
}

function sourceStatus(
  id: string,
  source: { name: string; shortName: string; publicUrl: string },
  result: PromiseSettledResult<any>,
  mode: string,
  updatedAt?: string | null,
) {
  return {
    id,
    name: source.name,
    shortName: source.shortName,
    url: source.publicUrl,
    mode,
    status: result.status === "fulfilled" ? "connected" : "unavailable",
    updatedAt: result.status === "fulfilled" ? updatedAt ?? null : null,
  };
}

export async function GET() {
  const [weatherResult, waterResult, roadsResult, ddpmResult] = await Promise.allSettled([
    getWeather(),
    getWater(),
    getRoadArchive(),
    getDdpmPreparedness(),
  ]);

  const weather = weatherResult.status === "fulfilled" ? weatherResult.value : null;
  const water = waterResult.status === "fulfilled" ? waterResult.value : null;
  const roads = roadsResult.status === "fulfilled" ? roadsResult.value : null;
  const ddpm = ddpmResult.status === "fulfilled" ? ddpmResult.value : null;
  const population = getPopulationScreening(water);

  return Response.json(
    {
      generatedAt: new Date().toISOString(),
      weather,
      water,
      roads,
      ddpm,
      population,
      sources: [
        sourceStatus(
          "tmd",
          SOURCES.tmd,
          weatherResult,
          "Live observations and official 7-day forecast",
          weather?.forecast?.issuedAt ?? weather?.observedAt,
        ),
        sourceStatus("thaiwater", SOURCES.water, waterResult, "Live gauges and 24-hour rainfall", water?.observedAt),
        sourceStatus("roads", SOURCES.roads, roadsResult, "Official road-flood archive (2022)", "2022"),
        sourceStatus("ddpm", SOURCES.ddpm, ddpmResult, "Official shelter preparedness dataset", ddpm?.datasetUpdatedAt),
        {
          id: "dopa",
          name: SOURCES.population.name,
          shortName: SOURCES.population.shortName,
          url: SOURCES.population.publicUrl,
          mode: "Official June 2026 registered-population snapshot",
          status: "connected",
          updatedAt: "2026-06",
        },
      ],
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
      },
    },
  );
}
import { parse as parseCsv } from "csv-parse/sync";
import { XMLParser } from "fast-xml-parser";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCES = {
  tmd: {
    name: "Thai Meteorological Department",
    shortName: "TMD",
    observationUrl: "https://data.tmd.go.th/api/Weather3Hours/V2/?uid=api&ukey=api12345",
    forecastUrl: "https://data.tmd.go.th/api/WeatherForecast7Days/v2/?uid=api&ukey=api12345",
    publicUrl: "https://data.tmd.go.th/dataset/index.php",
    nwpUrl: "https://data.tmd.go.th/nwpapi/v1/forecast/location/daily/at",
    nwpDocsUrl: "https://data.tmd.go.th/nwpapi/doc/apidoc/location/forecast_daily.html",
  },
  pointForecast: {
    name: "Open-Meteo multi-model forecast",
    shortName: "Open-Meteo",
    url: "https://api.open-meteo.com/v1/forecast",
    publicUrl: "https://open-meteo.com/en/docs",
  },
  water: {
    name: "National Hydroinformatics Data Center",
    shortName: "ThaiWater",
    waterUrl: "https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load",
    rainUrl: "https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h",
    publicUrl: "https://www.thaiwater.net/",
  },
  roads: {
    name: "Department of Rural Roads",
    shortName: "DRR",
    url: "https://dataportal.drr.go.th/dataset/187480f0-45e9-433f-9964-909cab4f5289/resource/a87bcef5-c3c6-4c0b-b86b-5fc2f1934277/download/flood.json",
    publicUrl: "https://datagov.mot.go.th/dataset/fms2_flood",
  },
  ddpm: {
    name: "Department of Disaster Prevention and Mitigation",
    shortName: "DDPM",
    metadataUrl: "https://catalog.disaster.go.th/api/3/action/package_show?id=dpm-gd002",
    publicUrl: "https://catalog.disaster.go.th/dataset/dpm-gd002",
  },
  population: {
    name: "Department of Provincial Administration",
    shortName: "DOPA",
    dataUrl: "https://stat.bora.dopa.go.th/new_stat/file/69/2_6906.xls",
    publicUrl: "https://stat.bora.dopa.go.th/new_stat/webPage/statByMooBan.php?month=06&year=69",
  },
} as const;

const REGISTERED_POPULATION = [
  { district: "Mae Sot District", population: 180_834 },
  { district: "Umphang District", population: 54_049 },
  { district: "Tha Song Yang District", population: 102_587 },
  { district: "Mae Ramat District", population: 60_532 },
  { district: "Phop Phra District", population: 102_526 },
] as const;

const TARGET_DISTRICTS_EN = new Set([
  "Mae Sot District",
  "Umphang District",
  "Tha Song Yang District",
  "Mae Ramat District",
  "Phop Phra District",
]);

const TARGET_DISTRICTS_TH = new Set(["แม่สอด", "อุ้มผาง", "ท่าสองยาง", "แม่ระมาด", "พบพระ"]);

const TARGET_TMD_STATIONS = new Set(["MAE SOT", "UMPHANG"]);

const DISTRICT_FORECAST_LOCATIONS = [
  { district: "Mae Sot District", latitude: 16.716, longitude: 98.571 },
  { district: "Umphang District", latitude: 16.017, longitude: 98.862 },
  { district: "Tha Song Yang District", latitude: 17.227, longitude: 98.225 },
  { district: "Mae Ramat District", latitude: 16.985, longitude: 98.516 },
  { district: "Phop Phra District", latitude: 16.384, longitude: 98.69 },
] as const;

type DistrictCondition =
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

type DistrictForecastDay = {
  date: string;
  maximumTemperatureC: number;
  minimumTemperatureC: number;
  rainChancePercent: number | null;
  precipitationMm: number;
  windSpeedKmh: number;
  windDirectionDegrees: number;
  humidityPercent: number | null;
  condition: DistrictCondition;
};

type DistrictForecast = {
  district: string;
  latitude: number;
  longitude: number;
  days: DistrictForecastDay[];
};

type DistrictForecastResult = {
  forecasts: DistrictForecast[];
  source: {
    id: "tmd-nwp" | "open-meteo";
    name: string;
    shortName: string;
    sourceUrl: string;
    issuedAt: string;
    official: boolean;
  };
};

async function fetchWithTimeout(url: string, timeoutMs = 15_000, headers: HeadersInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json, application/xml, text/csv;q=0.9, */*;q=0.8", ...headers },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function stationName(item: Record<string, any>) {
  return (
    item?.station?.tele_station_name?.en ||
    item?.station?.tele_station_name?.th ||
    item?.station?.tele_station_oldcode ||
    "Unnamed station"
  );
}

function xmlValue(value: any) {
  return value && typeof value === "object" && "#text" in value ? value["#text"] : value;
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

async function getTmdDistrictForecasts(token: string): Promise<DistrictForecastResult> {
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
      `${SOURCES.tmd.nwpUrl}?${parameters}`,
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
      sourceUrl: SOURCES.tmd.nwpDocsUrl,
      issuedAt: timestampInBangkok(),
      official: true,
    },
  };
}

async function getOpenMeteoDistrictForecasts(): Promise<DistrictForecastResult> {
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
  const response = await fetchWithTimeout(`${SOURCES.pointForecast.url}?${parameters}`, 20_000);
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
      name: SOURCES.pointForecast.name,
      shortName: SOURCES.pointForecast.shortName,
      sourceUrl: SOURCES.pointForecast.publicUrl,
      issuedAt: timestampInBangkok(),
      official: false,
    },
  };
}

async function getDistrictForecasts(): Promise<DistrictForecastResult> {
  const token = process.env.TMD_NWP_API_TOKEN?.trim();
  if (token) {
    try {
      return await getTmdDistrictForecasts(token);
    } catch (error) {
      console.error("TMD NWP district forecast unavailable; using point-model fallback", error);
    }
  }
  return getOpenMeteoDistrictForecasts();
}

async function getWeather() {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const [observationResult, forecastResult, districtForecastResult] = await Promise.allSettled([
    fetchWithTimeout(SOURCES.tmd.observationUrl),
    fetchWithTimeout(SOURCES.tmd.forecastUrl),
    getDistrictForecasts(),
  ]);

  if (observationResult.status === "rejected" && forecastResult.status === "rejected" && districtForecastResult.status === "rejected") {
    throw new Error("TMD observation and forecast feeds unavailable");
  }

  let stations: Array<{
    code: string;
    name: string;
    observedAt: string;
    temperatureC: number;
    humidityPercent: number;
    rainfallMm: number;
    rainfall24hMm: number;
    windSpeedKmh: number;
    latitude: number;
    longitude: number;
  }> = [];

  if (observationResult.status === "fulfilled") {
    const xml = (await observationResult.value.text()).replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
    const parsed = parser.parse(xml);
    const stationNodes = asArray(parsed?.Weather3Hours?.Stations?.Station ?? parsed?.Weather3Hours?.Station);

    stations = stationNodes
      .filter((station: any) => station?.Province === "ตาก" && TARGET_TMD_STATIONS.has(String(station?.StationNameEnglish ?? "")))
      .map((station: any) => ({
        code: String(xmlValue(station.WmoStationNumber) ?? ""),
        name: String(station.StationNameEnglish ?? station.StationNameThai ?? "TMD station"),
        observedAt: String(station.Observation?.DateTime ?? ""),
        temperatureC: Number(xmlValue(station.Observation?.AirTemperature) ?? 0),
        humidityPercent: Number(xmlValue(station.Observation?.RelativeHumidity) ?? 0),
        rainfallMm: Number(xmlValue(station.Observation?.Rainfall) ?? 0),
        rainfall24hMm: Number(xmlValue(station.Observation?.Rainfall24Hr) ?? 0),
        windSpeedKmh: Number(xmlValue(station.Observation?.WindSpeed) ?? 0),
        latitude: Number(xmlValue(station.Latitude) ?? 0),
        longitude: Number(xmlValue(station.Longitude) ?? 0),
      }))
      .sort((a: any, b: any) => b.rainfall24hMm - a.rainfall24hMm);
  }

  let forecast: {
    province: string;
    issuedAt: string;
    days: Array<{
      date: string;
      maximumTemperatureC: number;
      minimumTemperatureC: number;
      windDirectionDegrees: number;
      windSpeedKnots: number;
      rainChancePercent: number;
      descriptionEn: string;
      descriptionTh: string;
    }>;
    sourceUrl: string;
  } | null = null;

  if (forecastResult.status === "fulfilled") {
    const xml = (await forecastResult.value.text()).replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
    const parsed = parser.parse(xml);
    const root = parsed?.WeatherForecast7Days;
    const province = asArray<any>(root?.Provinces?.Province).find(
      (item) => String(item?.ProvinceNameEnglish ?? "").trim().toLowerCase() === "tak",
    );
    const values = province?.SevenDaysForecast;
    const dates = asArray<any>(values?.ForecastDate);
    const maximums = asArray<any>(values?.MaximumTemperature);
    const minimums = asArray<any>(values?.MinimumTemperature);
    const windDirections = asArray<any>(values?.WindDirection);
    const windSpeeds = asArray<any>(values?.WindSpeed);
    const rainChances = asArray<any>(values?.PercentRainCover);
    const descriptionsEn = asArray<any>(values?.DescriptionEnglish);
    const descriptionsTh = asArray<any>(values?.DescriptionThai);

    const days = dates.map((rawDate, index) => {
      const [day, month, year] = String(xmlValue(rawDate) ?? "").split("/");
      return {
        date: year && month && day ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}` : "",
        maximumTemperatureC: Number(xmlValue(maximums[index]) ?? 0),
        minimumTemperatureC: Number(xmlValue(minimums[index]) ?? 0),
        windDirectionDegrees: Number(xmlValue(windDirections[index]) ?? 0),
        windSpeedKnots: Number(xmlValue(windSpeeds[index]) ?? 0),
        rainChancePercent: Number(xmlValue(rainChances[index]) ?? 0),
        descriptionEn: String(xmlValue(descriptionsEn[index]) ?? "Forecast unavailable"),
        descriptionTh: String(xmlValue(descriptionsTh[index]) ?? ""),
      };
    }).filter((day) => day.date).sort((a, b) => a.date.localeCompare(b.date));

    if (province && days.length > 0) {
      forecast = {
        province: String(province.ProvinceNameEnglish ?? "Tak"),
        issuedAt: String(root?.header?.LastBuildDate ?? ""),
        days,
        sourceUrl: SOURCES.tmd.publicUrl,
      };
    }
  }

  return {
    stations,
    observedAt: stations[0]?.observedAt ?? null,
    forecast,
    districtForecasts: districtForecastResult.status === "fulfilled" ? districtForecastResult.value.forecasts : [],
    districtForecastSource: districtForecastResult.status === "fulfilled" ? districtForecastResult.value.source : null,
    sourceUrl: SOURCES.tmd.publicUrl,
  };
}

async function getWater() {
  const [waterResponse, rainResponse] = await Promise.all([
    fetchWithTimeout(SOURCES.water.waterUrl, 20_000),
    fetchWithTimeout(SOURCES.water.rainUrl, 20_000),
  ]);
  const [waterJson, rainJson] = await Promise.all([waterResponse.json(), rainResponse.json()]);

  const waterStations = asArray<any>((waterJson as any)?.waterlevel_data?.data)
    .filter((item) => item?.geocode?.province_code === "63" && TARGET_DISTRICTS_EN.has(String(item?.geocode?.amphoe_name?.en ?? "")))
    .map((item) => ({
      id: String(item.id),
      code: String(item?.station?.tele_station_oldcode ?? item.id),
      name: stationName(item),
      district: String(item?.geocode?.amphoe_name?.en ?? item?.geocode?.amphoe_name?.th ?? "Tak"),
      river: String(item?.river_name ?? "Watercourse"),
      observedAt: String(item?.waterlevel_datetime ?? ""),
      levelMsl: Number(item?.waterlevel_msl ?? 0),
      previousLevelMsl: Number(item?.waterlevel_msl_previous ?? item?.waterlevel_msl ?? 0),
      bankDistanceM: Number(item?.diff_wl_bank ?? 0),
      bankDistanceText: String(item?.diff_wl_bank_text ?? ""),
      situationLevel: Number(item?.situation_level ?? 0),
      storagePercent: Number(item?.storage_percent ?? 0),
      latitude: Number(item?.station?.tele_station_lat ?? 0),
      longitude: Number(item?.station?.tele_station_long ?? 0),
      agency: String(item?.agency?.agency_shortname?.en ?? item?.agency?.agency_name?.en ?? "Government station"),
    }))
    .sort((a, b) => b.situationLevel - a.situationLevel || a.bankDistanceM - b.bankDistanceM);

  const rainfallStations = asArray<any>((rainJson as any)?.data)
    .filter((item) => item?.geocode?.province_code === "63" && TARGET_DISTRICTS_EN.has(String(item?.geocode?.amphoe_name?.en ?? "")))
    .map((item) => ({
      id: String(item.id),
      code: String(item?.station?.tele_station_oldcode ?? item.id),
      name: stationName(item),
      district: String(item?.geocode?.amphoe_name?.en ?? item?.geocode?.amphoe_name?.th ?? "Tak"),
      observedAt: String(item?.rainfall_datetime ?? ""),
      rainfall1hMm: Number(item?.rain_1h ?? 0),
      rainfall24hMm: Number(item?.rain_24h ?? 0),
      latitude: Number(item?.station?.tele_station_lat ?? 0),
      longitude: Number(item?.station?.tele_station_long ?? 0),
      agency: String(item?.agency?.agency_shortname?.en ?? item?.agency?.agency_name?.en ?? "Government station"),
    }))
    .sort((a, b) => b.rainfall24hMm - a.rainfall24hMm);

  return {
    stations: waterStations,
    rainfallStations,
    flaggedCount: waterStations.filter((station) => station.situationLevel >= 4).length,
    observedAt: waterStations[0]?.observedAt ?? rainfallStations[0]?.observedAt ?? null,
    sourceUrl: SOURCES.water.publicUrl,
  };
}

async function getRoadArchive() {
  const response = await fetchWithTimeout(SOURCES.roads.url, 25_000);
  const bytes = await response.arrayBuffer();
  const json = JSON.parse(new TextDecoder("utf-8").decode(bytes));
  const records = Array.isArray(json)
    ? json
    : ((Object.values(json).find((value) => Array.isArray(value)) as any[]) ?? []);
  const takRecords = records
    .filter((record) => {
      if (String(record.PROVINCE ?? "").trim() !== "ตาก") return false;
      const locationText = `${record.TITLE ?? ""} ${record.DESCRIPTION ?? ""}`;
      return Array.from(TARGET_DISTRICTS_TH).some((district) => locationText.includes(district));
    })
    .map((record) => ({
      id: String(record.ID ?? record.FLOOD_ID ?? ""),
      title: String(record.TITLE ?? "Road flood record"),
      road: String(record.ROAD ?? ""),
      date: String(record.DATE ?? ""),
      passable: String(record.CANPASS ?? "").toLowerCase() === "t",
      floodHeightCm: Number(record.FLOOD_HEIGHT ?? 0),
      latitude: Number(record.LATITUDE ?? 0),
      longitude: Number(record.LONGITUDE ?? 0),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    records: takRecords.slice(0, 10),
    recordCount: takRecords.length,
    blockedCount: takRecords.filter((record) => !record.passable).length,
    archiveYear: 2022,
    sourceUrl: SOURCES.roads.publicUrl,
  };
}

async function getDdpmPreparedness() {
  const metadataResponse = await fetchWithTimeout(SOURCES.ddpm.metadataUrl);
  const metadata = await metadataResponse.json() as any;
  const csvResource = asArray<any>(metadata?.result?.resources).find(
    (resource) => String(resource?.format ?? "").toUpperCase() === "CSV",
  );
  if (!csvResource?.url) throw new Error("DDPM CSV resource unavailable");

  const csvResponse = await fetchWithTimeout(csvResource.url, 20_000);
  const csvBytes = await csvResponse.arrayBuffer();
  const csvText = new TextDecoder("utf-8").decode(csvBytes);
  const rows = parseCsv(csvText, {
    bom: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as string[][];
  const takRows = rows.slice(1).filter(
    (row) => String(row[2] ?? "").trim() === "ตาก" && TARGET_DISTRICTS_TH.has(String(row[3] ?? "").trim()),
  );
  const districtCounts = new Map<string, number>();
  let totalCapacity = 0;

  for (const row of takRows) {
    const district = String(row[3] ?? "Unknown").trim();
    districtCounts.set(district, (districtCounts.get(district) ?? 0) + 1);
    totalCapacity += Number(String(row[7] ?? "0").replace(/,/g, "")) || 0;
  }

  return {
    shelterCount: takRows.length,
    totalCapacity,
    districts: Array.from(districtCounts, ([district, count]) => ({ district, count })),
    datasetUpdatedAt: String(csvResource.last_modified ?? metadata?.result?.metadata_modified ?? ""),
    sourceUrl: SOURCES.ddpm.publicUrl,
  };
}

function getPopulationScreening(water: Awaited<ReturnType<typeof getWater>> | null) {
  const flaggedDistricts = new Set(
    (water?.stations ?? [])
      .filter((station) => station.situationLevel >= 4)
      .map((station) => station.district),
  );
  const districts = REGISTERED_POPULATION.map((district) => ({
    ...district,
    screenedAsExposed: flaggedDistricts.has(district.district),
  }));

  return {
    districts,
    totalTargetPopulation: districts.reduce((total, district) => total + district.population, 0),
    exposedScreeningPopulation: water
      ? districts.filter((district) => district.screenedAsExposed).reduce((total, district) => total + district.population, 0)
      : null,
    flaggedDistrictCount: flaggedDistricts.size,
    referencePeriod: "June 2026",
    methodology: "Registered population in target districts containing at least one ThaiWater situation level 4-5 gauge.",
    sourceUrl: SOURCES.population.publicUrl,
    downloadUrl: SOURCES.population.dataUrl,
  };
}

function sourceStatus(
  id: string,
  source: { name: string; shortName: string; publicUrl: string },
  result: PromiseSettledResult<any>,
  mode: string,
  updatedAt?: string | null,
) {
  return {
    id,
    name: source.name,
    shortName: source.shortName,
    url: source.publicUrl,
    mode,
    status: result.status === "fulfilled" ? "connected" : "unavailable",
    updatedAt: result.status === "fulfilled" ? updatedAt ?? null : null,
  };
}

export async function GET() {
  const [weatherResult, waterResult, roadsResult, ddpmResult] = await Promise.allSettled([
    getWeather(),
    getWater(),
    getRoadArchive(),
    getDdpmPreparedness(),
  ]);

  const weather = weatherResult.status === "fulfilled" ? weatherResult.value : null;
  const water = waterResult.status === "fulfilled" ? waterResult.value : null;
  const roads = roadsResult.status === "fulfilled" ? roadsResult.value : null;
  const ddpm = ddpmResult.status === "fulfilled" ? ddpmResult.value : null;
  const population = getPopulationScreening(water);

  return Response.json(
    {
      generatedAt: new Date().toISOString(),
      weather,
      water,
      roads,
      ddpm,
      population,
      sources: [
        sourceStatus(
          "tmd",
          SOURCES.tmd,
          weatherResult,
          "Live observations and official 7-day forecast",
          weather?.forecast?.issuedAt ?? weather?.observedAt,
        ),
        sourceStatus("thaiwater", SOURCES.water, waterResult, "Live gauges and 24-hour rainfall", water?.observedAt),
        sourceStatus("roads", SOURCES.roads, roadsResult, "Official road-flood archive (2022)", "2022"),
        sourceStatus("ddpm", SOURCES.ddpm, ddpmResult, "Official shelter preparedness dataset", ddpm?.datasetUpdatedAt),
        {
          id: "dopa",
          name: SOURCES.population.name,
          shortName: SOURCES.population.shortName,
          url: SOURCES.population.publicUrl,
          mode: "Official June 2026 registered-population snapshot",
          status: "connected",
          updatedAt: "2026-06",
        },
      ],
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
      },
    },
  );
}
