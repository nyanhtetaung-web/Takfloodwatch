import { parse as parseCsv } from "csv-parse/sync";
import { XMLParser } from "fast-xml-parser";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCES = {
  tmd: {
    name: "Thai Meteorological Department",
    shortName: "TMD",
    url: "https://data.tmd.go.th/api/Weather3Hours/V2/?uid=api&ukey=api12345",
    publicUrl: "https://data.tmd.go.th/dataset/index.php",
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

async function fetchWithTimeout(url: string, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json, application/xml, text/csv;q=0.9, */*;q=0.8" },
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

async function getWeather() {
  const response = await fetchWithTimeout(SOURCES.tmd.url);
  const xml = (await response.text()).replace(/&#x([0-9a-f]+);/gi, (_, code) =>
    String.fromCodePoint(Number.parseInt(code, 16)),
  );
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const parsed = parser.parse(xml);
  const stationNodes = asArray(parsed?.Weather3Hours?.Stations?.Station ?? parsed?.Weather3Hours?.Station);

  const stations = stationNodes
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

  return {
    stations,
    observedAt: stations[0]?.observedAt ?? null,
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
        sourceStatus("tmd", SOURCES.tmd, weatherResult, "Live 3-hour observation", weather?.observedAt),
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
