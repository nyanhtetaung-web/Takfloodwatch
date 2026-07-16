import { XMLParser } from "fast-xml-parser";

const FORECAST_URL = "https://data.tmd.go.th/api/WeatherForecast7Days/v2/?uid=api&ukey=api12345";
export const TMD_PUBLIC_URL = "https://data.tmd.go.th/dataset/index.php";

export type TakProvinceForecast = {
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
};

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function xmlValue(value: any) {
  return value && typeof value === "object" && "#text" in value ? value["#text"] : value;
}

export async function fetchTakProvinceForecast(timeoutMs = 15_000): Promise<TakProvinceForecast> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(FORECAST_URL, {
      headers: { Accept: "application/xml, text/xml;q=0.9, */*;q=0.8" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`TMD forecast returned ${response.status}`);

    const xml = (await response.text()).replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
    const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" }).parse(xml);
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

    if (!province || days.length === 0) throw new Error("TMD did not return a Tak forecast");
    return {
      province: String(province.ProvinceNameEnglish ?? "Tak"),
      issuedAt: String(root?.header?.LastBuildDate ?? ""),
      days,
      sourceUrl: TMD_PUBLIC_URL,
    };
  } finally {
    clearTimeout(timeout);
  }
}
