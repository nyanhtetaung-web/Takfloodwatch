"use client";

import {
  Activity,
  BellRing,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  CloudRain,
  Crosshair,
  Database,
  ExternalLink,
  Gauge,
  Info,
  Languages,
  LifeBuoy,
  Map,
  MapPin,
  Minus,
  RefreshCw,
  Route,
  Satellite,
  Search,
  ShieldAlert,
  Thermometer,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Users,
  Wind,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import InteractiveMap, { type BaseMap, type FloodMapPoint } from "./InteractiveMap";
import AlertSubscriptionDialog from "./AlertSubscriptionDialog";
import { thaiTranslations } from "./thaiTranslations";

type Severity = "critical" | "warning";
type Language = "en" | "my" | "th";

type WaterStation = {
  id: string;
  code: string;
  name: string;
  district: string;
  river: string;
  observedAt: string;
  levelMsl: number;
  previousLevelMsl: number;
  bankDistanceM: number;
  bankDistanceText: string;
  situationLevel: number;
  storagePercent: number;
  latitude: number;
  longitude: number;
  agency: string;
};

type RainStation = {
  id: string;
  code: string;
  name: string;
  district: string;
  observedAt: string;
  rainfall1hMm: number;
  rainfall24hMm: number;
  latitude: number;
  longitude: number;
  agency: string;
};

type WeatherStation = {
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
};

type WeatherForecastDay = {
  date: string;
  maximumTemperatureC: number;
  minimumTemperatureC: number;
  windDirectionDegrees: number;
  windSpeedKnots: number;
  rainChancePercent: number;
  descriptionEn: string;
  descriptionTh: string;
};

type WeatherForecast = {
  province: string;
  issuedAt: string;
  days: WeatherForecastDay[];
  sourceUrl: string;
};

type DistrictCondition = "clear" | "partly-cloudy" | "cloudy" | "overcast" | "fog" | "light-rain" | "moderate-rain" | "heavy-rain" | "thunderstorm" | "unknown";

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

type DistrictForecastSource = {
  id: "tmd-nwp" | "open-meteo";
  name: string;
  shortName: string;
  sourceUrl: string;
  issuedAt: string;
  official: boolean;
};

type SourceStatus = {
  id: string;
  name: string;
  shortName: string;
  url: string;
  mode: string;
  status: "connected" | "unavailable";
  updatedAt: string | null;
};

type GovernmentData = {
  generatedAt: string;
  weather: {
    stations: WeatherStation[];
    observedAt: string | null;
    forecast: WeatherForecast | null;
    districtForecasts: DistrictForecast[];
    districtForecastSource: DistrictForecastSource | null;
    sourceUrl: string;
  } | null;
  water: {
    stations: WaterStation[];
    rainfallStations: RainStation[];
    flaggedCount: number;
    observedAt: string | null;
    sourceUrl: string;
  } | null;
  roads: {
    records: Array<{ id: string; title: string; road: string; date: string; passable: boolean; floodHeightCm: number }>;
    recordCount: number;
    blockedCount: number;
    archiveYear: number;
    sourceUrl: string;
  } | null;
  ddpm: {
    shelterCount: number;
    totalCapacity: number;
    districts: Array<{ district: string; count: number }>;
    datasetUpdatedAt: string;
    sourceUrl: string;
  } | null;
  population: {
    districts: Array<{ district: string; population: number; screenedAsExposed: boolean }>;
    totalTargetPopulation: number;
    exposedScreeningPopulation: number | null;
    flaggedDistrictCount: number;
    referencePeriod: string;
    methodology: string;
    sourceUrl: string;
    downloadUrl: string;
  };
  sources: SourceStatus[];
};

type LiveAlert = {
  id: string;
  severity: Severity;
  title: string;
  district: string;
  detail: string;
  time: string;
  level: string;
  delta: string;
  station: WaterStation;
};

type PublishedWarning = {
  id: string;
  status: "published";
  severity: "watch" | "warning" | "critical";
  district: "All districts" | "Mae Sot" | "Umphang" | "Tha Song Yang" | "Mae Ramat" | "Phop Phra";
  titleEn: string;
  titleMy: string;
  titleTh: string;
  bodyEn: string;
  bodyMy: string;
  bodyTh: string;
  sourceName: string;
  sourceUrl: string | null;
  publishedAt: string;
  expiresAt: string;
};

const districtDefinitions = [
  { name: "Mae Sot", nameMy: "မဲဆောက်", nameTh: "แม่สอด", apiName: "Mae Sot District" },
  { name: "Umphang", nameMy: "အုမ်းဖန်", nameTh: "อุ้มผาง", apiName: "Umphang District" },
  { name: "Tha Song Yang", nameMy: "ထာဆောင်ယန်း", nameTh: "ท่าสองยาง", apiName: "Tha Song Yang District" },
  { name: "Mae Ramat", nameMy: "မယ်ရမတ်", nameTh: "แม่ระมาด", apiName: "Mae Ramat District" },
  { name: "Phop Phra", nameMy: "ဖုပ်ဖရာ", nameTh: "พบพระ", apiName: "Phop Phra District" },
] as const;

const myTranslations: Record<string, string> = {
  "Overview": "ခြုံငုံသုံးသပ်ချက်",
  "Water flags": "ရေအဆင့် သတိပေးချက်",
  "Districts": "ခရိုင်များ",
  "Sources": "ဒေတာရင်းမြစ်များ",
  "official sources": "တရားဝင် ဒေတာရင်းမြစ်",
  "FIVE WESTERN TAK DISTRICTS - OFFICIAL GOVERNMENT FEEDS": "တာ့ခ်ပြည်နယ် အနောက်ပိုင်း ခရိုင် ၅ ခု - အစိုးရတရားဝင် ဒေတာ",
  "Western Tak flood monitoring": "တာ့ခ်အနောက်ပိုင်း ရေဘေးစောင့်ကြည့်မှု",
  "Generated": "ဒေတာရယူချိန်",
  "when feeds respond": "ဒေတာရရှိသည့်အခါ",
  "NO DEMO READINGS": "စမ်းသပ်ဒေတာ မပါ",
  "Refreshing": "ပြန်လည်ရယူနေသည်",
  "Refresh official data": "တရားဝင်ဒေတာ ပြန်လည်ရယူရန်",
  "Loading official government feeds": "အစိုးရတရားဝင် ဒေတာများ ရယူနေသည်",
  "TMD, ThaiWater, DRR, and DDPM are being checked independently.": "TMD၊ ThaiWater၊ DRR နှင့် DDPM တို့ကို သီးခြားစစ်ဆေးနေသည်။",
  "Official feeds could not be reached": "တရားဝင်ဒေတာရင်းမြစ်များ ချိတ်ဆက်မရပါ",
  "No cached demonstration values are being shown. Refresh to try again.": "သိမ်းဆည်းထားသော စမ်းသပ်ဒေတာကို မပြပါ။ ပြန်လည်ရယူရန် နှိပ်ပါ။",
  "This is a feed-based monitoring flag, not an evacuation order. Confirm the latest agency bulletin before field action.": "၎င်းသည် ဒေတာအခြေပြု စောင့်ကြည့်သတိပေးချက်သာဖြစ်ပြီး ရွှေ့ပြောင်းအမိန့် မဟုတ်ပါ။ လုပ်ဆောင်မီ သက်ဆိုင်ရာဌာန၏ နောက်ဆုံးကြေညာချက်ကို အတည်ပြုပါ။",
  "Open ThaiWater": "ThaiWater ကို ဖွင့်ရန်",
  "No level 4-5 Tak water stations returned": "အဆင့် ၄-၅ ရေတိုင်းစခန်း မတွေ့ရှိပါ",
  "This is not an all-clear. Continue checking TMD, ThaiWater, DDPM, and local authority notices.": "၎င်းသည် အန္တရာယ်ကင်းကြောင်း ကြေညာချက် မဟုတ်ပါ။ TMD၊ ThaiWater၊ DDPM နှင့် ဒေသအာဏာပိုင် ကြေညာချက်များကို ဆက်လက်စစ်ဆေးပါ။",
  "Rainfall": "မိုးရေချိန်",
  "All gauges": "ရေတိုင်းစခန်းအားလုံး",
  "No level 4-5 stations": "အဆင့် ၄-၅ စခန်း မတွေ့ပါ",
  "Based on the latest ThaiWater response.": "ThaiWater ၏ နောက်ဆုံးဒေတာအရ။",
  "View source details": "ရင်းမြစ်အသေးစိတ် ကြည့်ရန်",
  "THAIWATER LIVE FEED": "THAIWATER တိုက်ရိုက်ဒေတာ",
  "High water flags": "ရေအဆင့်မြင့် သတိပေးချက်",
  "Search station or district": "စခန်း သို့မဟုတ် ခရိုင် ရှာရန်",
  "All": "အားလုံး",
  "No official water flags match this filter.": "ဤစစ်ထုတ်မှုနှင့် ကိုက်ညီသော တရားဝင်သတိပေးချက် မရှိပါ။",
  "TMD observations": "TMD တိုင်းတာချက်များ",
  "target-area stations": "ပစ်မှတ်ဧရိယာ စခန်းများ",
  "target-area gauges": "ပစ်မှတ်ဧရိယာ ရေတိုင်းစခန်းများ",
  "target-area archive records": "ပစ်မှတ်ဧရိယာ မှတ်တမ်းဟောင်းများ",
  "target-area shelter records": "ပစ်မှတ်ဧရိယာ ခိုလှုံရာမှတ်တမ်းများ",
  "TMD feed unavailable.": "TMD ဒေတာ မရရှိနိုင်ပါ။",
  "WATER LEVEL FLAGS": "ရေအဆင့် သတိပေးချက်",
  "ThaiWater level 4-5": "ThaiWater အဆင့် ၄-၅",
  "MAXIMUM RAIN 24H": "၂၄ နာရီအတွင်း အများဆုံးမိုးရေ",
  "No feed": "ဒေတာမရှိ",
  "FIVE-DISTRICT GAUGES": "ခရိုင် ၅ ခု ရေတိုင်းစခန်းများ",
  "DDPM SHELTER RECORDS": "DDPM ခိုလှုံရာ မှတ်တမ်းများ",
  "Dataset: Aug 2024": "ဒေတာစုံ: ၂၀၂၄ ဩဂုတ်",
  "Official sources": "တရားဝင် ဒေတာရင်းမြစ်များ",
  "Each feed is checked independently": "ဒေတာရင်းမြစ်တိုင်းကို သီးခြားစစ်ဆေးသည်",
  "LATEST THAIWATER RESPONSE": "THAIWATER နောက်ဆုံးဒေတာ",
  "Five-district water gauges": "ခရိုင် ၅ ခု ရေတိုင်းစခန်းများ",
  "stations": "စခန်းများ",
  "Station": "စခန်း",
  "Level": "အဆင့်",
  "Bank distance": "ကမ်းပါးအကွာအဝေး",
  "Status": "အခြေအနေ",
  "Reported difference": "ရင်းမြစ်မှ ဖော်ပြသည့် ကွာဟချက်",
  "ThaiWater feed unavailable. No substitute values are shown.": "ThaiWater ဒေတာ မရရှိနိုင်ပါ။ အစားထိုးတန်ဖိုး မပြပါ။",
  "FIVE TARGET DISTRICTS": "ပစ်မှတ်ခရိုင် ၅ ခု",
  "Feed coverage": "ဒေတာလွှမ်းခြုံမှု",
  "5 districts checked": "ခရိုင် ၅ ခု စစ်ဆေးပြီး",
  "District": "ခရိုင်",
  "Rain 24h": "၂၄ နာရီ မိုးရေ",
  "Water": "ရေအခြေအနေ",
  "Maximum": "အများဆုံး",
  "No station": "စခန်းမရှိ",
  "No gauge": "ရေတိုင်းစခန်းမရှိ",
  "Operational use:": "လုပ်ငန်းသုံး သတိပြုရန်:",
  "Feed values can be delayed, missing, or revised by the source agency. The DRR road dataset shown in source status is a 2022 archive, not current road passability. For current highway conditions use the official DOH hotline 1586 and agency bulletins.": "ဒေတာတန်ဖိုးများသည် နောက်ကျခြင်း၊ ပျောက်ဆုံးခြင်း သို့မဟုတ် ရင်းမြစ်ဌာနက ပြင်ဆင်ခြင်း ဖြစ်နိုင်သည်။ DRR လမ်းဒေတာသည် ၂၀၂၂ မှတ်တမ်းဖြစ်ပြီး လက်ရှိလမ်းသွားလာနိုင်မှု မဟုတ်ပါ။ လက်ရှိလမ်းအခြေအနေအတွက် DOH အရေးပေါ်ဖုန်း 1586 နှင့် တရားဝင်ကြေညာချက်များကို အသုံးပြုပါ။",
  "Close station details": "စခန်းအသေးစိတ် ပိတ်ရန်",
  "Tak Province": "တာ့ခ်ပြည်နယ်",
  "Water level": "ရေအဆင့်",
  "from previous": "ယခင်တိုင်းတာချက်မှ",
  "Source agency": "ရင်းမြစ်ဌာန",
  "Observed": "တိုင်းတာချိန်",
  "River": "မြစ်",
  "Situation code": "အခြေအနေကုဒ်",
  "Do not issue evacuation or road-closure instructions from this dashboard alone. Confirm with DDPM and the responsible local authority.": "ဤဒက်ရှ်ဘုတ်တစ်ခုတည်းကို အခြေခံ၍ ရွှေ့ပြောင်းခြင်း သို့မဟုတ် လမ်းပိတ်ခြင်း အမိန့် မထုတ်ပါနှင့်။ DDPM နှင့် သက်ဆိုင်ရာ ဒေသအာဏာပိုင်ကို အတည်ပြုပါ။",
  "Close details": "အသေးစိတ် ပိတ်ရန်",
  "Very high water situation": "အလွန်မြင့်မားသော ရေအခြေအနေ",
  "High water situation": "ရေအဆင့်မြင့် အခြေအနေ",
  "Not reported": "မဖော်ပြထားပါ",
  "Language": "ဘာသာစကား",
  "Official water level notice": "တရားဝင် ရေအဆင့် အသိပေးချက်",
  "Zoom in": "မြေပုံချဲ့ရန်",
  "Zoom out": "မြေပုံလျှော့ရန်",
  "Center map": "မြေပုံအလယ်ထားရန်",
  "Filter water flags": "ရေအဆင့် သတိပေးချက် စစ်ထုတ်ရန်",
  "Official feed coverage for the five target districts": "ပစ်မှတ်ခရိုင် ၅ ခုအတွက် တရားဝင်ဒေတာ လွှမ်းခြုံမှု",
  "Source value": "ရင်းမြစ်မှ တန်ဖိုး",
  "Streets": "လမ်းမြေပုံ",
  "Satellite": "ဂြိုဟ်တုမြေပုံ",
  "Interactive monitoring map": "အပြန်အလှန် အသုံးပြုနိုင်သော စောင့်ကြည့်မြေပုံ",
  "Map style": "မြေပုံပုံစံ",
  "POPULATION SCREENING": "လူဦးရေ ထိခိုက်နိုင်မှု စိစစ်ချက်",
  "Potentially exposed population": "ထိခိုက်နိုင်သည့် လူဦးရေ",
  "people": "ဦး",
  "registered population in districts with a level 4-5 gauge": "အဆင့် ၄-၅ ရေတိုင်းစခန်းရှိသော ခရိုင်များ၏ မှတ်ပုံတင်လူဦးရေ",
  "Target-area registered population": "ပစ်မှတ်ဧရိယာ မှတ်ပုံတင်လူဦးရေ",
  "June 2026 DOPA registry": "DOPA ၂၀၂၆ ဇွန် မှတ်ပုံတင်စာရင်း",
  "No level 4-5 district currently identified": "လက်ရှိ အဆင့် ၄-၅ ခရိုင် မတွေ့ရှိပါ",
  "District-level screening estimate, not a flood-footprint count.": "ခရိုင်အဆင့် စိစစ်ခန့်မှန်းချက်သာဖြစ်ပြီး ရေလွှမ်းဧရိယာအတွင်း လူဦးရေတွက်ချက်မှု မဟုတ်ပါ။",
  "Open DOPA population source": "DOPA လူဦးရေဒေတာ ဖွင့်ရန်",
  "RIVER LEVEL TREND": "မြစ်ရေအဆင့် လမ်းကြောင်း",
  "Latest two gauge observations": "နောက်ဆုံး ရေတိုင်းတာချက် နှစ်ခု",
  "River level and bank threshold": "မြစ်ရေအဆင့်နှင့် ကမ်းပါးအမှတ်",
  "Choose gauge": "ရေတိုင်းစခန်း ရွေးရန်",
  "Previous": "ယခင်",
  "Current": "လက်ရှိ",
  "Change from previous": "ယခင်တိုင်းတာချက်မှ ပြောင်းလဲမှု",
  "Reported bank level": "ဖော်ပြထားသော ကမ်းပါးအဆင့်",
  "Two source readings only": "ရင်းမြစ်တိုင်းတာချက် နှစ်ခုသာ",
  "River level chart": "မြစ်ရေအဆင့်ဇယား",
  "Official DOPA registered population": "DOPA တရားဝင် မှတ်ပုံတင်လူဦးရေ",
  "target-district population": "ပစ်မှတ်ခရိုင် လူဦးရေ",
  "Request Help": "အကူအညီတောင်းရန်",
  "Damage Assessment": "ပျက်စီးမှုစိစစ်ချက်",
};

function formatFeedTime(value?: string | null, language: Language = "en") {
  if (!value) return language === "my" ? myTranslations["Not reported"] : language === "th" ? thaiTranslations["Not reported"] : "Not reported";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.replace("T", " ").slice(0, 16);
  return value;
}

function levelLabel(level: number, language: Language = "en") {
  if (language === "my") return level > 0 ? `အဆင့် ${level}` : "အဆင့်မရှိ";
  if (language === "th") return level > 0 ? `ระดับ ${level}` : "ไม่มีระดับ";
  if (level >= 5) return "Level 5";
  if (level >= 4) return "Level 4";
  if (level >= 3) return "Level 3";
  if (level > 0) return `Level ${level}`;
  return "No level";
}

function displayDistrictName(apiName: string, language: Language) {
  const district = districtDefinitions.find((item) => item.apiName === apiName);
  if (!district) return apiName.replace(" District", "");
  return language === "my" ? district.nameMy : language === "th" ? district.nameTh : district.name;
}

function formatPopulation(value: number | null | undefined, language: Language) {
  if (value == null) return "-";
  return new Intl.NumberFormat(language === "my" ? "my-MM" : language === "th" ? "th-TH" : "en-US").format(value);
}

function localized(language: Language, english: string, burmese: string, thai: string) {
  return language === "my" ? burmese : language === "th" ? thai : english;
}

function formatForecastDate(value: string, language: Language, short = false) {
  const date = new Date(`${value}T12:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return value;

  if (language === "my") {
    const weekdays = ["တနင်္ဂနွေ", "တနင်္လာ", "အင်္ဂါ", "ဗုဒ္ဓဟူး", "ကြာသပတေး", "သောကြာ", "စနေ"];
    const months = ["ဇန်နဝါရီ", "ဖေဖော်ဝါရီ", "မတ်", "ဧပြီ", "မေ", "ဇွန်", "ဇူလိုင်", "ဩဂုတ်", "စက်တင်ဘာ", "အောက်တိုဘာ", "နိုဝင်ဘာ", "ဒီဇင်ဘာ"];
    const burmeseDay = String(date.getDate()).replace(/[0-9]/g, (digit) => "၀၁၂၃၄၅၆၇၈၉"[Number(digit)]);
    return `${weekdays[date.getDay()]}${short ? "" : "နေ့"} ${burmeseDay} ${months[date.getMonth()]}`;
  }

  return new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-GB", {
    weekday: short ? "short" : "long",
    day: "numeric",
    month: short ? "short" : "long",
  }).format(date);
}

function forecastDescription(day: WeatherForecastDay, language: Language) {
  if (language === "th") return day.descriptionTh || day.descriptionEn;
  if (language === "en") return day.descriptionEn;

  const description = day.descriptionEn.toLowerCase();
  if (description.includes("heavy rain")) return "မိုးသည်းထန်စွာ ရွာနိုင်သည်";
  if (description.includes("thunder")) return "မိုးကြိုးမုန်တိုင်းနှင့် မိုးရွာနိုင်သည်";
  if (description.includes("rain")) return "မိုးရွာနိုင်သည်";
  if (description.includes("cloud")) return "တိမ်ထူနိုင်သည်";
  if (description.includes("clear") || description.includes("fair")) return "ကောင်းကင် ကြည်လင်နိုင်သည်";
  return day.descriptionEn;
}

function districtForecastDescription(condition: DistrictCondition, language: Language) {
  const descriptions: Record<DistrictCondition, [string, string, string]> = {
    clear: ["Clear sky", "ကောင်းကင်ကြည်လင်", "ท้องฟ้าแจ่มใส"],
    "partly-cloudy": ["Partly cloudy", "တိမ်အသင့်အတင့်", "มีเมฆบางส่วน"],
    cloudy: ["Cloudy", "တိမ်ထူ", "มีเมฆมาก"],
    overcast: ["Overcast", "မိုးအုံ့", "ท้องฟ้าปิด"],
    fog: ["Fog or low cloud", "မြူ သို့မဟုတ် တိမ်နိမ့်", "หมอกหรือเมฆต่ำ"],
    "light-rain": ["Light rain or showers", "မိုးဖွဲ သို့မဟုတ် မိုးရွာ", "ฝนเล็กน้อยหรือฝนซู่"],
    "moderate-rain": ["Moderate rain", "မိုးအသင့်အတင့်", "ฝนปานกลาง"],
    "heavy-rain": ["Heavy rain", "မိုးသည်းထန်", "ฝนตกหนัก"],
    thunderstorm: ["Thunderstorms", "မိုးကြိုးမုန်တိုင်း", "พายุฝนฟ้าคะนอง"],
    unknown: ["Forecast condition unavailable", "ခန့်မှန်းအခြေအနေ မရရှိနိုင်ပါ", "ไม่พบสภาพอากาศพยากรณ์"],
  };
  const [english, burmese, thai] = descriptions[condition];
  return localized(language, english, burmese, thai);
}

function rainChanceLabel(value: number | null, language: Language) {
  if (value == null) return localized(language, "N/A", "မရှိ", "ไม่มีข้อมูล");
  return `${Math.round(value)}%`;
}

function RiverLevelChart({ station, language, sourceUrl, tr }: { station: WaterStation; language: Language; sourceUrl: string; tr: (text: string) => string }) {
  const bankLevel = station.levelMsl + station.bankDistanceM;
  const values = [station.previousLevelMsl, station.levelMsl, bankLevel];
  const minimum = Math.min(...values) - 0.25;
  const maximum = Math.max(...values) + 0.25;
  const range = Math.max(maximum - minimum, 0.1);
  const y = (value: number) => 184 - ((value - minimum) / range) * 136;
  const previousY = y(station.previousLevelMsl);
  const currentY = y(station.levelMsl);
  const bankY = y(bankLevel);
  const change = station.levelMsl - station.previousLevelMsl;
  const trendTone = Math.abs(change) < 0.005 ? "steady" : change > 0 ? "rising" : "falling";
  const TrendIcon = trendTone === "rising" ? TrendingUp : trendTone === "falling" ? TrendingDown : Minus;
  const trendLabel = localized(language, trendTone === "rising" ? "Rising" : trendTone === "falling" ? "Falling" : "Steady", trendTone === "rising" ? "မြင့်တက်" : trendTone === "falling" ? "ကျဆင်း" : "တည်ငြိမ်", trendTone === "rising" ? "สูงขึ้น" : trendTone === "falling" ? "ลดลง" : "คงที่");
  const bankRelation = station.bankDistanceM >= 0
    ? localized(language, "Below reported bank", "ဖော်ပြထားသော ကမ်းပါးအောက်", "ต่ำกว่าระดับตลิ่งที่รายงาน")
    : localized(language, "Above reported bank", "ဖော်ပြထားသော ကမ်းပါးအထက်", "สูงกว่าระดับตลิ่งที่รายงาน");
  const bankTone = station.bankDistanceM < 0 ? "above" : station.bankDistanceM <= 1 ? "near" : "below";
  const riskTone = station.situationLevel >= 5 ? "critical" : station.situationLevel >= 4 ? "warning" : station.situationLevel >= 3 ? "watch" : "normal";
  const ticks = Array.from({ length: 5 }, (_, index) => maximum - (range * index) / 4);

  return (
    <div className="river-chart-wrap">
      <div className="river-station-summary">
        <div className="river-station-identity">
          <span className="river-station-code">{station.code}</span>
          <span><b>{station.name}</b><small><MapPin size={12} /> {displayDistrictName(station.district, language)} · {station.river}</small></span>
        </div>
        <i className={`risk-badge ${riskTone}`}>{levelLabel(station.situationLevel, language)}</i>
      </div>

      <div className="river-reading-grid">
        <span><small>{tr("Current")}</small><strong>{station.levelMsl.toFixed(2)} m</strong><em>MSL</em></span>
        <span><small>{tr("Change from previous")}</small><strong className={trendTone}><TrendIcon size={15} /> {change >= 0 ? "+" : ""}{change.toFixed(2)} m</strong><em>{trendLabel}</em></span>
        <span><small>{tr("Bank distance")}</small><strong className={bankTone}>{Math.abs(station.bankDistanceM).toFixed(2)} m</strong><em>{bankRelation}</em></span>
        <span><small>{tr("Reported bank level")}</small><strong>{bankLevel.toFixed(2)} m</strong><em>MSL</em></span>
      </div>

      <svg className="river-chart" viewBox="0 0 620 230" role="img" aria-label={`${tr("River level chart")}: ${station.name}`}>
        <rect className="bank-zone" x="70" y="48" width="500" height={Math.max(0, bankY - 48)} />
        <text className="chart-unit" x="56" y="30" textAnchor="end">m MSL</text>
        {ticks.map((tick) => {
          const tickY = y(tick);
          return <g key={tick.toFixed(4)}><line className="chart-gridline" x1="70" x2="570" y1={tickY} y2={tickY} /><text className="chart-axis-value" x="57" y={tickY + 3} textAnchor="end">{tick.toFixed(2)}</text></g>;
        })}
        <line className="bank-line" x1="70" x2="570" y1={bankY} y2={bankY} />
        <text className="bank-label" x="564" y={Math.max(18, bankY - 8)} textAnchor="end">{tr("Reported bank level")} {bankLevel.toFixed(2)} m</text>
        <path className="river-area" d={`M 116 ${previousY} L 524 ${currentY} L 524 184 L 116 184 Z`} />
        <line className={`river-line ${trendTone}`} x1="116" x2="524" y1={previousY} y2={currentY} />
        <circle className="river-point previous" cx="116" cy={previousY} r="7" />
        <circle className={`river-point-halo ${trendTone}`} cx="524" cy={currentY} r="14" />
        <circle className={`river-point current ${trendTone}`} cx="524" cy={currentY} r="8" />
        <text className="point-value" x="116" y={Math.max(20, previousY - 14)} textAnchor="middle">{station.previousLevelMsl.toFixed(2)} m</text>
        <text className="point-value" x="524" y={Math.max(20, currentY - 14)} textAnchor="middle">{station.levelMsl.toFixed(2)} m</text>
        <text className="axis-label" x="116" y="216" textAnchor="middle">{tr("Previous")}</text>
        <text className="axis-label" x="524" y="216" textAnchor="middle">{tr("Current")}</text>
      </svg>

      <div className="river-source-row">
        <span><Activity size={14} /><small>{tr("Observed")}</small><b>{formatFeedTime(station.observedAt, language)}</b></span>
        <span><Building2 size={14} /><small>{tr("Source agency")}</small><b>{station.agency}</b></span>
        <a href={sourceUrl} target="_blank" rel="noreferrer">{tr("Open ThaiWater")} <ExternalLink size={14} /></a>
      </div>
      <p className="chart-footnote">{tr("Two source readings only")}</p>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<GovernmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [severity, setSeverity] = useState<"all" | Severity>("all");
  const [query, setQuery] = useState("");
  const [mapLayer, setMapLayer] = useState<"warnings" | "rainfall" | "gauges" | "forecast">("warnings");
  const [baseMap, setBaseMap] = useState<BaseMap>("streets");
  const [selectedForecastIndex, setSelectedForecastIndex] = useState(0);
  const [selectedForecastDistrict, setSelectedForecastDistrict] = useState("Mae Sot District");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [selectedGaugeCode, setSelectedGaugeCode] = useState("");
  const [bannerVisible, setBannerVisible] = useState(true);
  const [language, setLanguage] = useState<Language>("en");
  const [publishedWarnings, setPublishedWarnings] = useState<PublishedWarning[]>([]);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [savedAlertDistrict, setSavedAlertDistrict] = useState("All districts");
  const tr = useCallback((text: string) => language === "my" ? myTranslations[text] ?? text : language === "th" ? thaiTranslations[text] ?? text : text, [language]);

  const loadGovernmentData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/government-data", { cache: "no-store" });
      if (!response.ok) throw new Error("Government feed request failed");
      const nextData = await response.json() as GovernmentData;
      setData(nextData);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGovernmentData();
  }, [loadGovernmentData]);

  const loadPublishedWarnings = useCallback(async () => {
    try {
      const response = await fetch("/api/alerts", { cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json() as { alerts?: PublishedWarning[] };
      setPublishedWarnings(result.alerts ?? []);
    } catch {
      // Government monitoring remains available if the alert service is temporarily unreachable.
    }
  }, []);

  useEffect(() => {
    void loadPublishedWarnings();
    const timer = window.setInterval(() => void loadPublishedWarnings(), 60_000);
    return () => window.clearInterval(timer);
  }, [loadPublishedWarnings]);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("floodwatch-language");
    if (savedLanguage === "en" || savedLanguage === "my" || savedLanguage === "th") setLanguage(savedLanguage);
  }, []);

  useEffect(() => {
    const syncAlertPreferences = () => setSavedAlertDistrict(window.localStorage.getItem("floodwatch-alert-district") ?? "All districts");
    syncAlertPreferences();
    window.addEventListener("floodwatch-alert-preferences", syncAlertPreferences);
    return () => window.removeEventListener("floodwatch-alert-preferences", syncAlertPreferences);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("floodwatch-language", language);
  }, [language]);

  const alerts = useMemo<LiveAlert[]>(() => {
    return (data?.water?.stations ?? [])
      .filter((station) => station.situationLevel >= 4)
      .map((station) => {
        const change = station.levelMsl - station.previousLevelMsl;
        return {
          id: station.code,
          severity: station.situationLevel >= 5 ? "critical" : "warning",
          title: tr(station.situationLevel >= 5 ? "Very high water situation" : "High water situation"),
          district: displayDistrictName(station.district, language),
          detail: station.bankDistanceM >= 0
            ? localized(language, `${station.bankDistanceM.toFixed(2)} m below the reported bank level`, `ဖော်ပြထားသော ကမ်းပါးအဆင့်အောက် ${station.bankDistanceM.toFixed(2)} မီတာ`, `ต่ำกว่าระดับตลิ่งที่รายงาน ${station.bankDistanceM.toFixed(2)} เมตร`)
            : localized(language, `${Math.abs(station.bankDistanceM).toFixed(2)} m above the reported bank level`, `ဖော်ပြထားသော ကမ်းပါးအဆင့်အထက် ${Math.abs(station.bankDistanceM).toFixed(2)} မီတာ`, `สูงกว่าระดับตลิ่งที่รายงาน ${Math.abs(station.bankDistanceM).toFixed(2)} เมตร`),
          time: formatFeedTime(station.observedAt, language),
          level: `${station.levelMsl.toFixed(2)} m MSL`,
          delta: `${change >= 0 ? "+" : ""}${change.toFixed(2)} m`,
          station,
        };
      });
  }, [data, language, tr]);

  const selected = alerts.find((alert) => alert.id === selectedId) ?? alerts[0] ?? null;
  const drawerAlert = alerts.find((alert) => alert.id === drawerId) ?? null;

  const filteredAlerts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return alerts.filter((alert) => {
      const severityMatch = severity === "all" || alert.severity === severity;
      const searchMatch = !normalized || `${alert.title} ${alert.district} ${alert.id}`.toLowerCase().includes(normalized);
      return severityMatch && searchMatch;
    });
  }, [alerts, query, severity]);

  const districtRows = useMemo(() => {
    const waterStations = data?.water?.stations ?? [];
    const rainStations = data?.water?.rainfallStations ?? [];
    return districtDefinitions.map((district) => {
      const districtWater = waterStations.filter((station) => station.district === district.apiName);
      const districtRain = rainStations.filter((station) => station.district === district.apiName);
      const maximumLevel = districtWater.reduce((maximum, station) => Math.max(maximum, station.situationLevel), 0);
      const maximumRain = districtRain.reduce((maximum, station) => Math.max(maximum, station.rainfall24hMm), 0);
      return { ...district, gaugeCount: districtWater.length, rainCount: districtRain.length, maximumLevel, maximumRain };
    });
  }, [data]);

  const connectedCount = data?.sources.filter((source) => source.status === "connected").length ?? 0;
  const sourceCount = data?.sources.length ?? 5;
  const maximumRainStation = data?.water?.rainfallStations?.[0] ?? null;
  const districtForecasts = data?.weather?.districtForecasts ?? [];
  const selectedDistrictForecast = districtForecasts.find((forecast) => forecast.district === selectedForecastDistrict) ?? districtForecasts[0] ?? null;
  const forecastDays = selectedDistrictForecast?.days ?? [];
  const selectedForecast = forecastDays[selectedForecastIndex] ?? forecastDays[0] ?? null;
  const provinceForecastDays = data?.weather?.forecast?.days ?? [];
  const selectedProvinceForecast = provinceForecastDays.find((day) => day.date === selectedForecast?.date)
    ?? provinceForecastDays[selectedForecastIndex]
    ?? provinceForecastDays[0]
    ?? null;
  const selectedGauge = data?.water?.stations.find((station) => station.code === selectedGaugeCode) ?? data?.water?.stations[0] ?? null;
  const publishedWarning = publishedWarnings.find((warning) => savedAlertDistrict === "All districts" || warning.district === "All districts" || warning.district === savedAlertDistrict) ?? null;
  const publishedWarningTitle = publishedWarning ? language === "my" ? publishedWarning.titleMy : language === "th" ? publishedWarning.titleTh : publishedWarning.titleEn : "";
  const publishedWarningBody = publishedWarning ? language === "my" ? publishedWarning.bodyMy : language === "th" ? publishedWarning.bodyTh : publishedWarning.bodyEn : "";
  const mapPoints = useMemo<FloodMapPoint[]>(() => {
    if (mapLayer === "warnings") {
      return alerts.map((alert) => ({
        id: alert.id,
        latitude: alert.station.latitude,
        longitude: alert.station.longitude,
        label: alert.station.name,
        district: alert.district,
        value: `${alert.level} - ${levelLabel(alert.station.situationLevel, language)}`,
        tone: alert.severity,
        warningId: alert.id,
      }));
    }

    if (mapLayer === "rainfall") {
      return (data?.water?.rainfallStations ?? []).map((station) => ({
        id: station.id,
        latitude: station.latitude,
        longitude: station.longitude,
        label: station.name,
        district: displayDistrictName(station.district, language),
        value: localized(language, `${station.rainfall24hMm} mm in 24h`, `၂၄ နာရီ မိုးရေ ${station.rainfall24hMm} mm`, `ฝน 24 ชม. ${station.rainfall24hMm} มม.`),
        tone: "rainfall",
      }));
    }

    if (mapLayer === "forecast") {
      if (districtForecasts.length > 0) {
        return districtForecasts.flatMap((forecast) => {
          const day = forecast.days[selectedForecastIndex] ?? forecast.days[0];
          if (!day) return [];
          return [{
            id: `district-forecast-${forecast.district}`,
            latitude: forecast.latitude,
            longitude: forecast.longitude,
            label: displayDistrictName(forecast.district, language),
            district: formatForecastDate(day.date, language, true),
            value: `${districtForecastDescription(day.condition, language)} · ${rainChanceLabel(day.rainChancePercent, language)} · ${day.minimumTemperatureC.toFixed(0)}-${day.maximumTemperatureC.toFixed(0)} C`,
            tone: "forecast" as const,
            forecastDistrict: forecast.district,
          }];
        });
      }

      if (!selectedProvinceForecast) return [];
      return [{
        id: `tmd-forecast-${selectedProvinceForecast.date}`,
        latitude: 16.82,
        longitude: 98.62,
        label: localized(language, "Tak Province forecast", "တက်ခ်ခရိုင် မိုးလေဝသခန့်မှန်းချက်", "พยากรณ์จังหวัดตาก"),
        district: localized(language, "Five western Tak districts", "တက်ခ်အနောက်ပိုင်း ခရိုင် ၅ ခု", "5 อำเภอฝั่งตะวันตกของตาก"),
        value: `${forecastDescription(selectedProvinceForecast, language)} · ${selectedProvinceForecast.rainChancePercent}% · ${selectedProvinceForecast.minimumTemperatureC}-${selectedProvinceForecast.maximumTemperatureC} C`,
        tone: "forecast",
      }];
    }

    return (data?.water?.stations ?? []).map((station) => ({
      id: station.code,
      latitude: station.latitude,
      longitude: station.longitude,
      label: station.name,
      district: displayDistrictName(station.district, language),
      value: `${station.levelMsl.toFixed(2)} m MSL - ${levelLabel(station.situationLevel, language)}`,
      tone: station.situationLevel >= 5 ? "critical" : station.situationLevel >= 4 ? "warning" : "watch",
      warningId: station.situationLevel >= 4 ? station.code : undefined,
    }));
  }, [alerts, data, districtForecasts, language, mapLayer, selectedForecastIndex, selectedProvinceForecast]);

  const forecastOverlay = useMemo(() => {
    if (mapLayer !== "forecast") return null;
    if (districtForecasts.length > 0) {
      return {
        label: localized(language, "Five district point forecasts", "ခရိုင်ငါးခုအတွက် တည်နေရာအလိုက် ခန့်မှန်းချက်", "พยากรณ์รายจุด 5 อำเภอ"),
        zones: districtForecasts.flatMap((forecast) => {
          const day = forecast.days[selectedForecastIndex] ?? forecast.days[0];
          if (!day) return [];
          const probability = day.rainChancePercent ?? selectedProvinceForecast?.rainChancePercent ?? 0;
          return [{
            latitude: forecast.latitude,
            longitude: forecast.longitude,
            rainChancePercent: probability,
            label: `${displayDistrictName(forecast.district, language)} · ${rainChanceLabel(day.rainChancePercent, language)} · ${day.precipitationMm.toFixed(1)} mm`,
          }];
        }),
      };
    }
    if (!selectedProvinceForecast) return null;
    return {
      rainChancePercent: selectedProvinceForecast.rainChancePercent,
      label: localized(
        language,
        `TMD Tak forecast area: ${selectedProvinceForecast.rainChancePercent}% rain chance`,
        `TMD တက်ခ်ခရိုင် ခန့်မှန်းဧရိယာ: မိုးရွာနိုင်ခြေ ${selectedProvinceForecast.rainChancePercent}%`,
        `พื้นที่พยากรณ์ TMD ตาก: โอกาสฝน ${selectedProvinceForecast.rainChancePercent}%`,
      ),
    };
  }, [districtForecasts, language, mapLayer, selectedForecastIndex, selectedProvinceForecast]);

  return (
    <main className="app-shell">
      <header className="topbar dashboard-topbar">
        <a className="brand" href="#overview" aria-label={`Help Without Frontiers - ${tr("Overview")}`}>
          <img className="brand-logo" src="/hwf-site-logo.png" alt="Help Without Frontiers" />
          <span>FLOODWATCH</span>
        </a>

        <nav className="primary-nav" aria-label={tr("Overview")}>
          <a className="active" href="#overview">{tr("Overview")}</a>
          <a href="#alerts">{tr("Water flags")} <span className="nav-count">{alerts.length}</span></a>
          <a href="#districts">{tr("Districts")}</a>
          <a href="#sources">{tr("Sources")}</a>
          <a href="/request-help">{tr("Request Help")}</a>
          <a href="/damage-assessment">{tr("Damage Assessment")}</a>
        </nav>

        <div className="topbar-actions">
          <div className="language-switch" role="group" aria-label={tr("Language")}>
            <Languages size={15} />
            <button type="button" aria-pressed={language === "en"} className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>EN</button>
            <button type="button" aria-pressed={language === "my"} className={language === "my" ? "active" : ""} onClick={() => setLanguage("my")}>မြန်မာ</button>
            <button type="button" aria-pressed={language === "th"} className={language === "th" ? "active" : ""} onClick={() => setLanguage("th")}>ไทย</button>
          </div>
          <div className="system-state" aria-label={`${connectedCount}/${sourceCount} ${tr("official sources")}`}>
            <span className={connectedCount === sourceCount ? "live-dot" : "live-dot partial"} />
            <span>{connectedCount}/{sourceCount} {tr("official sources")}</span>
          </div>
          <button className="subscribe-alert-button" type="button" onClick={() => setSubscriptionOpen(true)} aria-label={localized(language, "Subscribe to alerts", "သတိပေးချက် ရယူရန်", "สมัครรับคำเตือน")}>
            <BellRing size={17} />
            <span>{localized(language, "Subscribe to alerts", "သတိပေးချက် ရယူရန်", "สมัครรับคำเตือน")}</span>
            {publishedWarnings.length > 0 && <i>{publishedWarnings.length}</i>}
          </button>
          <div className="operator-avatar" aria-label={tr("Tak Province")}>TAK</div>
        </div>
      </header>

      <div className="page-content" id="overview">
        <div className="page-heading">
          <div>
            <p className="eyebrow">{tr("FIVE WESTERN TAK DISTRICTS - OFFICIAL GOVERNMENT FEEDS")}</p>
            <h1>{tr("Western Tak flood monitoring")}</h1>
            <p className="heading-meta">
              <span>{tr("Generated")} {data ? new Date(data.generatedAt).toLocaleString(language === "my" ? "my-MM" : language === "th" ? "th-TH" : "en-GB") : tr("when feeds respond")}</span>
              <span className="meta-separator" />
              <span className="official-badge">{tr("NO DEMO READINGS")}</span>
            </p>
          </div>
          <button className="dispatch-button" type="button" onClick={() => void loadGovernmentData()} disabled={loading}>
            <RefreshCw className={loading ? "spinning" : ""} size={18} /> {tr(loading ? "Refreshing" : "Refresh official data")}
          </button>
        </div>

        {publishedWarning && (
          <section className={`published-warning ${publishedWarning.severity}`} role="alert" aria-live="assertive">
            <span className="published-warning-icon"><ShieldAlert size={23} /></span>
            <div className="published-warning-copy">
              <small>{localized(language, "STAFF-APPROVED EARLY WARNING", "ဝန်ထမ်းအတည်ပြု ကြိုတင်သတိပေးချက်", "คำเตือนล่วงหน้าที่เจ้าหน้าที่อนุมัติ")}</small>
              <strong>{publishedWarningTitle}</strong>
              <p>{publishedWarningBody}</p>
              <span>{publishedWarning.district === "All districts" ? localized(language, "All five districts", "ခရိုင်ငါးခုလုံး", "ทั้งห้าอำเภอ") : displayDistrictName(`${publishedWarning.district} District`, language)} · {new Date(publishedWarning.publishedAt).toLocaleString(language === "my" ? "my-MM" : language === "th" ? "th-TH" : "en-GB")}</span>
            </div>
            <div className="published-warning-actions">
              <button type="button" onClick={() => setSubscriptionOpen(true)}><BellRing size={16} /> {localized(language, "Subscribe", "စာရင်းသွင်းရန်", "สมัครรับคำเตือน")}</button>
              {publishedWarning.sourceUrl && <a href={publishedWarning.sourceUrl} target="_blank" rel="noreferrer">{publishedWarning.sourceName}<ExternalLink size={14} /></a>}
            </div>
          </section>
        )}

        {loading && (
          <section className="feed-banner neutral" aria-live="polite">
            <RefreshCw className="spinning" size={20} />
            <div><strong>{tr("Loading official government feeds")}</strong><span>{tr("TMD, ThaiWater, DRR, and DDPM are being checked independently.")}</span></div>
          </section>
        )}

        {!loading && loadError && (
          <section className="feed-banner unavailable" role="alert">
            <TriangleAlert size={20} />
            <div><strong>{tr("Official feeds could not be reached")}</strong><span>{tr("No cached demonstration values are being shown. Refresh to try again.")}</span></div>
          </section>
        )}

        {!loading && !loadError && alerts.length > 0 && bannerVisible && (
          <section className="critical-banner high-banner" aria-label={tr("Official water level notice")}>
            <div className="critical-icon"><TriangleAlert size={21} /></div>
            <div className="critical-copy">
              <strong>{localized(language, `${alerts.length} target-area station${alerts.length === 1 ? "" : "s"} returned ThaiWater situation level 4 or higher`, `ThaiWater အခြေအနေအဆင့် ၄ နှင့်အထက် စခန်း ${alerts.length} ခု ရှိသည်`, `พบสถานีในพื้นที่เป้าหมาย ${alerts.length} แห่งที่มีสถานการณ์ ThaiWater ระดับ 4 ขึ้นไป`)}</strong>
              <span>{tr("This is a feed-based monitoring flag, not an evacuation order. Confirm the latest agency bulletin before field action.")}</span>
            </div>
            <div className="banner-actions">
              <a className="source-link-button" href={data?.water?.sourceUrl} target="_blank" rel="noreferrer">{tr("Open ThaiWater")} <ExternalLink size={14} /></a>
              <button className="banner-close" type="button" aria-label={tr("Close details")} title={tr("Close details")} onClick={() => setBannerVisible(false)}><X size={18} /></button>
            </div>
          </section>
        )}

        {!loading && !loadError && alerts.length === 0 && (
          <section className="feed-banner connected">
            <CheckCircle2 size={20} />
            <div><strong>{tr("No level 4-5 Tak water stations returned")}</strong><span>{tr("This is not an all-clear. Continue checking TMD, ThaiWater, DDPM, and local authority notices.")}</span></div>
          </section>
        )}

        <section className="operations-grid">
          <div className="map-panel" aria-label={tr("Western Tak flood monitoring")}>
            <div className="map-toolbar">
              <div className="map-data-layers">
                <button className={mapLayer === "warnings" ? "active" : ""} type="button" onClick={() => setMapLayer("warnings")}>
                  <ShieldAlert size={15} /> {tr("Water flags")}
                </button>
                <button className={mapLayer === "rainfall" ? "active" : ""} type="button" onClick={() => setMapLayer("rainfall")}>
                  <CloudRain size={15} /> {tr("Rainfall")}
                </button>
                <button className={mapLayer === "forecast" ? "active" : ""} type="button" onClick={() => setMapLayer("forecast")}>
                  <Wind size={15} /> {localized(language, "Forecast", "ခန့်မှန်းချက်", "พยากรณ์")}
                </button>
                <button className={mapLayer === "gauges" ? "active" : ""} type="button" onClick={() => setMapLayer("gauges")}>
                  <Gauge size={15} /> {tr("All gauges")}
                </button>
              </div>
              <div className="basemap-switch" role="group" aria-label={tr("Map style")}>
                <button className={baseMap === "streets" ? "active" : ""} type="button" aria-pressed={baseMap === "streets"} onClick={() => setBaseMap("streets")}>
                  <Map size={15} /> {tr("Streets")}
                </button>
                <button className={baseMap === "satellite" ? "active" : ""} type="button" aria-pressed={baseMap === "satellite"} onClick={() => setBaseMap("satellite")}>
                  <Satellite size={15} /> {tr("Satellite")}
                </button>
              </div>
            </div>

            <div className={`map-canvas ${mapLayer === "forecast" ? "forecast-mode" : ""}`}>
              <InteractiveMap
                 baseMap={baseMap}
                 points={mapPoints}
                 selectedPointId={mapLayer === "forecast"
                   ? selectedDistrictForecast ? `district-forecast-${selectedDistrictForecast.district}` : mapPoints[0]?.id ?? null
                   : selected?.id ?? null}
                 ariaLabel={tr("Interactive monitoring map")}
                 zoomInLabel={tr("Zoom in")}
                 zoomOutLabel={tr("Zoom out")}
                 centerLabel={tr("Center map")}
                 forecastOverlay={forecastOverlay}
                 onSelectPoint={(point) => {
                   if (point.forecastDistrict) setSelectedForecastDistrict(point.forecastDistrict);
                   if (point.warningId) setSelectedId(point.warningId);
                 }}
               />

               {mapLayer === "warnings" && !loading && alerts.length === 0 && (
                 <div className="map-empty"><CheckCircle2 size={22} /><strong>{tr("No level 4-5 stations")}</strong><span>{tr("Based on the latest ThaiWater response.")}</span></div>
               )}

               {mapLayer === "forecast" && !loading && !selectedForecast && !selectedProvinceForecast && (
                 <div className="map-empty"><CloudRain size={22} /><strong>{localized(language, "TMD forecast unavailable", "TMD ခန့်မှန်းချက် မရရှိနိုင်ပါ", "ไม่พบข้อมูลพยากรณ์ TMD")}</strong><span>{localized(language, "Refresh to check the official feed again.", "တရားဝင်ဒေတာကို ပြန်စစ်ရန် ပြန်လည်ဖွင့်ပါ။", "รีเฟรชเพื่อตรวจสอบข้อมูลทางการอีกครั้ง")}</span></div>
               )}

               {mapLayer === "forecast" && selectedForecast && selectedDistrictForecast && data?.weather?.districtForecastSource && (
                 <>
                   <article className="tmd-weather-brief" aria-live="polite">
                     <div className="tmd-weather-heading">
                       <span><i className={data.weather.districtForecastSource.official ? "official" : "model"} /> {data.weather.districtForecastSource.shortName} {localized(language, data.weather.districtForecastSource.official ? "OFFICIAL POINT FORECAST" : "DISTRICT POINT FORECAST", data.weather.districtForecastSource.official ? "တရားဝင် တည်နေရာခန့်မှန်းချက်" : "ခရိုင် တည်နေရာခန့်မှန်းချက်", data.weather.districtForecastSource.official ? "พยากรณ์รายจุดทางการ" : "พยากรณ์รายจุดอำเภอ")}</span>
                       <a href={data.weather.districtForecastSource.sourceUrl} target="_blank" rel="noreferrer" aria-label={localized(language, "Open forecast source", "ခန့်မှန်းရင်းမြစ် ဖွင့်ရန်", "เปิดแหล่งข้อมูลพยากรณ์")}><ExternalLink size={14} /></a>
                     </div>
                     <div className="forecast-district-tabs" role="group" aria-label={localized(language, "Select district forecast", "ခရိုင်ခန့်မှန်းချက် ရွေးရန်", "เลือกพยากรณ์อำเภอ")}>{districtForecasts.map((forecast) => (
                       <button key={forecast.district} className={forecast.district === selectedDistrictForecast.district ? "active" : ""} type="button" aria-pressed={forecast.district === selectedDistrictForecast.district} onClick={() => setSelectedForecastDistrict(forecast.district)}>{displayDistrictName(forecast.district, language)}</button>
                     ))}</div>
                     <strong>{displayDistrictName(selectedDistrictForecast.district, language)} · {formatForecastDate(selectedForecast.date, language)}</strong>
                     <p>{districtForecastDescription(selectedForecast.condition, language)}</p>
                     <div className="tmd-weather-metrics">
                       <span><CloudRain size={16} /><small>{localized(language, "Rain chance / total", "မိုးရွာနိုင်ခြေ / စုစုပေါင်း", "โอกาสฝน / ปริมาณ")}</small><b>{rainChanceLabel(selectedForecast.rainChancePercent, language)} · {selectedForecast.precipitationMm.toFixed(1)} mm</b></span>
                       <span><Thermometer size={16} /><small>{localized(language, "Temperature", "အပူချိန်", "อุณหภูมิ")}</small><b>{selectedForecast.minimumTemperatureC.toFixed(0)}-{selectedForecast.maximumTemperatureC.toFixed(0)} C</b></span>
                       <span><Wind size={16} /><small>{localized(language, "Max wind", "အမြင့်ဆုံး လေတိုက်နှုန်း", "ลมสูงสุด")}</small><b>{selectedForecast.windSpeedKmh.toFixed(0)} km/h · {selectedForecast.windDirectionDegrees.toFixed(0)} deg</b></span>
                     </div>
                     {selectedProvinceForecast && <div className="forecast-official-reference"><b>TMD {localized(language, "Tak reference", "တက်ခ်ရည်ညွှန်းချက်", "ข้อมูลอ้างอิงตาก")}</b><span>{selectedProvinceForecast.rainChancePercent}% {localized(language, "rain", "မိုး", "ฝน")} · {selectedProvinceForecast.minimumTemperatureC}-{selectedProvinceForecast.maximumTemperatureC} C</span></div>}
                     <small className="forecast-scope-note">{data.weather.districtForecastSource.official
                       ? localized(language, "TMD NWP model guidance at a district reference coordinate; not a live station measurement.", "ခရိုင်ရည်ညွှန်းတည်နေရာရှိ TMD NWP မော်ဒယ်လမ်းညွှန်ဖြစ်ပြီး တိုက်ရိုက်စခန်းတိုင်းတာချက် မဟုတ်ပါ။", "ข้อมูลแนวทางจากแบบจำลอง TMD NWP ณ จุดอ้างอิงอำเภอ ไม่ใช่ค่าตรวจวัดสดจากสถานี")
                       : localized(language, "District point guidance from multi-model data; the official TMD Tak forecast is retained above as the province reference.", "မော်ဒယ်များစွာမှ ခရိုင်တည်နေရာလမ်းညွှန်ဖြစ်ပြီး အထက်ရှိ တရားဝင် TMD တက်ခ်ခန့်မှန်းချက်ကို ပြည်နယ်ရည်ညွှန်းချက်အဖြစ် ထိန်းသိမ်းထားသည်။", "ข้อมูลแนวทางรายจุดจากหลายแบบจำลอง โดยคงพยากรณ์ทางการ TMD ตากด้านบนเป็นข้อมูลอ้างอิงระดับจังหวัด")}</small>
                   </article>

                   <div className="forecast-timeline" aria-label={localized(language, "District seven-day forecast", "ခရိုင် ၇ ရက် မိုးလေဝသခန့်မှန်းချက်", "พยากรณ์อำเภอ 7 วัน")}>
                     <div className="forecast-timeline-meta">
                       <span>{localized(language, "DISTRICT 7-DAY OUTLOOK", "ခရိုင် ၇ ရက် ခန့်မှန်းချက်", "แนวโน้มอำเภอ 7 วัน")}</span>
                       <small>{localized(language, "Updated", "မွမ်းမံချိန်", "ปรับปรุง")} {formatFeedTime(data.weather.districtForecastSource.issuedAt, language)}</small>
                     </div>
                     <div className="forecast-day-list">
                       {forecastDays.map((day, index) => (
                         <button key={day.date} className={index === selectedForecastIndex ? "active" : ""} type="button" aria-pressed={index === selectedForecastIndex} onClick={() => setSelectedForecastIndex(index)}>
                           <small>{formatForecastDate(day.date, language, true)}</small>
                           <CloudRain size={17} />
                           <b>{rainChanceLabel(day.rainChancePercent, language)}</b>
                           <span>{day.minimumTemperatureC.toFixed(0)}-{day.maximumTemperatureC.toFixed(0)} C</span>
                           <em>{day.precipitationMm.toFixed(0)} mm</em>
                         </button>
                       ))}
                     </div>
                   </div>
                 </>
               )}

               {mapLayer === "forecast" && !selectedForecast && selectedProvinceForecast && data?.weather?.forecast && (
                 <>
                   <article className="tmd-weather-brief" aria-live="polite">
                     <div className="tmd-weather-heading"><span><i className="official" /> TMD {localized(language, "OFFICIAL PROVINCE FORECAST", "တရားဝင် ပြည်နယ်ခန့်မှန်းချက်", "พยากรณ์จังหวัดทางการ")}</span><a href={data.weather.forecast.sourceUrl} target="_blank" rel="noreferrer" aria-label={localized(language, "Open TMD source", "TMD ရင်းမြစ် ဖွင့်ရန်", "เปิดแหล่งข้อมูล TMD")}><ExternalLink size={14} /></a></div>
                     <strong>{localized(language, "Tak Province", "တက်ခ်ခရိုင်", "จังหวัดตาก")} · {formatForecastDate(selectedProvinceForecast.date, language)}</strong>
                     <p>{forecastDescription(selectedProvinceForecast, language)}</p>
                     <div className="tmd-weather-metrics"><span><CloudRain size={16} /><small>{localized(language, "Rain chance", "မိုးရွာနိုင်ခြေ", "โอกาสฝน")}</small><b>{selectedProvinceForecast.rainChancePercent}%</b></span><span><Thermometer size={16} /><small>{localized(language, "Temperature", "အပူချိန်", "อุณหภูมิ")}</small><b>{selectedProvinceForecast.minimumTemperatureC}-{selectedProvinceForecast.maximumTemperatureC} C</b></span><span><Wind size={16} /><small>{localized(language, "Wind", "လေတိုက်နှုန်း", "ลม")}</small><b>{selectedProvinceForecast.windSpeedKnots} kt · {selectedProvinceForecast.windDirectionDegrees} deg</b></span></div>
                     <small className="forecast-scope-note">{localized(language, "District point forecasts are temporarily unavailable; this is the official Tak-wide fallback.", "ခရိုင်တည်နေရာခန့်မှန်းချက် ယာယီမရရှိနိုင်သဖြင့် တက်ခ်ပြည်နယ်တစ်ခုလုံးအတွက် တရားဝင်အစားထိုးခန့်မှန်းချက်ဖြစ်သည်။", "พยากรณ์รายจุดอำเภอไม่พร้อมใช้งานชั่วคราว จึงแสดงพยากรณ์ทางการระดับจังหวัดตากแทน")}</small>
                   </article>
                   <div className="forecast-timeline"><div className="forecast-timeline-meta"><span>{localized(language, "TMD 7-DAY OUTLOOK", "TMD ၇ ရက် ခန့်မှန်းချက်", "แนวโน้ม TMD 7 วัน")}</span><small>{localized(language, "Issued", "ထုတ်ပြန်ချိန်", "ออกเมื่อ")} {formatFeedTime(data.weather.forecast.issuedAt, language)}</small></div><div className="forecast-day-list">{provinceForecastDays.map((day, index) => <button key={day.date} className={index === selectedForecastIndex ? "active" : ""} type="button" aria-pressed={index === selectedForecastIndex} onClick={() => setSelectedForecastIndex(index)}><small>{formatForecastDate(day.date, language, true)}</small><CloudRain size={17} /><b>{day.rainChancePercent}%</b><span>{day.minimumTemperatureC}-{day.maximumTemperatureC} C</span></button>)}</div></div>
                 </>
               )}

              {selected && mapLayer === "warnings" && (
                <article className="map-callout">
                  <div className="callout-heading"><span className={`severity-pill ${selected.severity}`}>{levelLabel(selected.station.situationLevel, language)}</span><span>{selected.id}</span></div>
                  <strong>{selected.station.name}</strong>
                  <p>{selected.district} - {selected.level}</p>
                  <button type="button" onClick={() => setDrawerId(selected.id)}>{tr("View source details")} <ChevronRight size={15} /></button>
                </article>
              )}

               {mapLayer !== "forecast" && (
                 <div className="map-legend">
                   {mapLayer === "rainfall" ? (
                     <span><i className="legend-dot rainfall" /> {localized(language, "24-hour rain gauge", "၂၄ နာရီ မိုးရေချိန်စခန်း", "สถานีฝน 24 ชั่วโมง")}</span>
                   ) : (
                     <>
                       <span><i className="legend-dot critical" /> {levelLabel(5, language)}</span>
                       <span><i className="legend-dot warning" /> {levelLabel(4, language)}</span>
                       <span><i className="legend-dot watch" /> {localized(language, "Level 1-3", "အဆင့် ၁-၃", "ระดับ 1-3")}</span>
                     </>
                   )}
                 </div>
               )}
            </div>
          </div>

          <aside className="alerts-panel" id="alerts">
            <div className="panel-heading">
              <div><span className="panel-kicker">{tr("THAIWATER LIVE FEED")}</span><h2>{tr("High water flags")} <span>{alerts.length}</span></h2></div>
              <a className="icon-button" href={data?.water?.sourceUrl ?? "https://www.thaiwater.net/"} target="_blank" rel="noreferrer" aria-label={tr("Open ThaiWater")} title={tr("Open ThaiWater")}><ExternalLink size={18} /></a>
            </div>

            <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr("Search station or district")} /></label>

            <div className="severity-tabs compact" aria-label={tr("Filter water flags")}>
              <button type="button" className={severity === "all" ? "active" : ""} onClick={() => setSeverity("all")}>{tr("All")}</button>
              <button type="button" className={severity === "critical" ? "active" : ""} onClick={() => setSeverity("critical")}>{levelLabel(5, language)}</button>
              <button type="button" className={severity === "warning" ? "active" : ""} onClick={() => setSeverity("warning")}>{levelLabel(4, language)}</button>
            </div>

            <div className="alert-list live-list">
              {filteredAlerts.map((alert) => (
                <article className={`alert-row ${selected?.id === alert.id ? "selected" : ""}`} key={alert.id}>
                  <button className="alert-main" type="button" onClick={() => { setSelectedId(alert.id); setDrawerId(alert.id); }}>
                    <span className={`alert-indicator ${alert.severity}`} />
                    <span className="alert-content">
                      <span className="alert-topline"><b>{alert.station.name}</b><small>{alert.time}</small></span>
                      <strong>{alert.district} - {levelLabel(alert.station.situationLevel, language)}</strong>
                      <span className="alert-reading"><Gauge size={14} /> {alert.level} <em>{alert.delta}</em></span>
                    </span>
                    <ChevronRight className="row-chevron" size={17} />
                  </button>
                </article>
              ))}
              {!loading && filteredAlerts.length === 0 && <p className="empty-state">{tr("No official water flags match this filter.")}</p>}
            </div>

            <div className="weather-summary">
              <div className="weather-summary-heading"><span>{tr("TMD observations")}</span><small>{data?.weather?.stations.length ?? 0} {tr("target-area stations")}</small></div>
              {(data?.weather?.stations ?? []).slice(0, 3).map((station) => (
                <div className="weather-row" key={station.code}>
                  <span><b>{station.name}</b><small>{formatFeedTime(station.observedAt, language)}</small></span>
                  <span><Thermometer size={13} /> {station.temperatureC.toFixed(1)} C</span>
                  <span><CloudRain size={13} /> {station.rainfall24hMm.toFixed(1)} mm</span>
                </div>
              ))}
              {!data?.weather && !loading && <p className="source-unavailable-copy">{tr("TMD feed unavailable.")}</p>}
            </div>
          </aside>
        </section>

        <section className="metric-strip" aria-label={tr("Western Tak flood monitoring")}>
          <div className="metric"><span className="metric-icon red"><ShieldAlert size={19} /></span><span><small>{tr("WATER LEVEL FLAGS")}</small><strong>{data?.water?.flaggedCount ?? "-"}</strong><em>{tr("ThaiWater level 4-5")}</em></span></div>
          <div className="metric"><span className="metric-icon gold"><CloudRain size={19} /></span><span><small>{tr("MAXIMUM RAIN 24H")}</small><strong>{maximumRainStation ? `${maximumRainStation.rainfall24hMm.toFixed(1)} mm` : "-"}</strong><em>{maximumRainStation?.name ?? tr("No feed")}</em></span></div>
          <div className="metric"><span className="metric-icon teal"><Gauge size={19} /></span><span><small>{tr("FIVE-DISTRICT GAUGES")}</small><strong>{data?.water?.stations.length ?? "-"}</strong><em>{formatFeedTime(data?.water?.observedAt, language)}</em></span></div>
          <div className="metric"><span className="metric-icon blue"><Building2 size={19} /></span><span><small>{tr("DDPM SHELTER RECORDS")}</small><strong>{data?.ddpm?.shelterCount ?? "-"}</strong><em>{tr("Dataset: Aug 2024")}</em></span></div>
        </section>

        <section className="source-status-strip" id="sources" aria-label={tr("Official sources")}>
          <div className="source-title"><Database size={18} /><span><strong>{tr("Official sources")}</strong><small>{tr("Each feed is checked independently")}</small></span></div>
          {(data?.sources ?? []).map((source) => (
            <a className="source-item" href={source.url} target="_blank" rel="noreferrer" key={source.id}>
              <span className={`source-state ${source.status}`} />
              <span>
                <strong>{source.shortName}</strong>
                <small>
                  {language === "en" ? source.mode : language === "my"
                    ? source.id === "tmd" ? "၃ နာရီတစ်ကြိမ် တိုက်ရိုက်တိုင်းတာချက်"
                      : source.id === "thaiwater" ? "ရေတိုင်းစခန်းနှင့် ၂၄ နာရီ မိုးရေ"
                      : source.id === "roads" ? "လမ်းရေဘေး မှတ်တမ်းဟောင်း (၂၀၂၂)"
                      : source.id === "ddpm" ? "ခိုလှုံရာ ပြင်ဆင်မှုဒေတာ"
                      : "DOPA ၂၀၂၆ ဇွန် မှတ်ပုံတင်လူဦးရေ"
                    : source.id === "tmd" ? "ข้อมูลตรวจวัดสดทุก 3 ชั่วโมง"
                      : source.id === "thaiwater" ? "สถานีระดับน้ำและฝน 24 ชั่วโมง"
                      : source.id === "roads" ? "ข้อมูลน้ำท่วมถนนย้อนหลัง (2022)"
                      : source.id === "ddpm" ? "ข้อมูลเตรียมพร้อมศูนย์พักพิง"
                      : "ประชากรตามทะเบียน DOPA มิ.ย. 2026"}
                  {source.id === "tmd" && data?.weather ? ` - ${data.weather.stations.length} ${tr("target-area stations")}` : ""}
                  {source.id === "thaiwater" && data?.water ? ` - ${data.water.stations.length} ${tr("target-area gauges")}` : ""}
                  {source.id === "roads" && data?.roads ? ` - ${data.roads.recordCount} ${tr("target-area archive records")}` : ""}
                  {source.id === "ddpm" && data?.ddpm ? ` - ${data.ddpm.shelterCount} ${tr("target-area shelter records")}` : ""}
                  {source.id === "dopa" && data?.population ? ` - ${formatPopulation(data.population.totalTargetPopulation, language)} ${tr("target-district population")}` : ""}
                </small>
              </span>
              <ExternalLink size={14} />
            </a>
          ))}
        </section>

        <section className="insight-grid" aria-label={tr("Potentially exposed population")}>
          <article className="population-panel">
            <div className="section-heading">
              <div><span className="panel-kicker">{tr("POPULATION SCREENING")}</span><h2>{tr("Potentially exposed population")}</h2></div>
              <a className="icon-button" href={data?.population.sourceUrl} target="_blank" rel="noreferrer" aria-label={tr("Open DOPA population source")} title={tr("Open DOPA population source")}><ExternalLink size={17} /></a>
            </div>

            <div className="exposure-summary">
              <span className="exposure-icon"><Users size={24} /></span>
              <span><strong>{formatPopulation(data?.population.exposedScreeningPopulation, language)}</strong><small>{tr("people")}</small></span>
              <p>{tr("registered population in districts with a level 4-5 gauge")}</p>
            </div>

            <div className="population-total">
              <span><small>{tr("Target-area registered population")}</small><b>{formatPopulation(data?.population.totalTargetPopulation, language)}</b></span>
              <span><small>{tr("June 2026 DOPA registry")}</small><b>{data?.population.flaggedDistrictCount ?? 0}/5 {tr("Districts")}</b></span>
            </div>

            <div className="population-list">
              {(data?.population.districts ?? []).map((district) => (
                <div className={`population-row ${district.screenedAsExposed ? "exposed" : ""}`} key={district.district}>
                  <span><i />{displayDistrictName(district.district, language)}</span>
                  <span className="population-bar"><i style={{ width: `${(district.population / Math.max(...(data?.population.districts ?? []).map((item) => item.population), 1)) * 100}%` }} /></span>
                  <b>{formatPopulation(district.population, language)}</b>
                </div>
              ))}
            </div>

            {!loading && data?.population.exposedScreeningPopulation === 0 && <p className="population-clear">{tr("No level 4-5 district currently identified")}</p>}
            <p className="screening-note"><Info size={14} /> {tr("District-level screening estimate, not a flood-footprint count.")}</p>
          </article>

          <article className="river-panel">
            <div className="section-heading river-heading">
              <div><span className="panel-kicker">{tr("RIVER LEVEL TREND")}</span><h2>{tr("River level and bank threshold")}</h2></div>
              <span className="coverage-count">{data?.water?.stations.length ?? 0} {tr("stations")}</span>
            </div>

            <label className="gauge-selector">
              <span>{tr("Choose gauge")}</span>
              <select value={selectedGauge?.code ?? ""} onChange={(event) => setSelectedGaugeCode(event.target.value)}>
                {(data?.water?.stations ?? []).map((station) => <option value={station.code} key={station.code}>{station.name} - {displayDistrictName(station.district, language)} - {station.levelMsl.toFixed(2)} m</option>)}
              </select>
            </label>

            {selectedGauge && data?.water ? <RiverLevelChart station={selectedGauge} language={language} sourceUrl={data.water.sourceUrl} tr={tr} /> : <p className="empty-state">{tr("ThaiWater feed unavailable. No substitute values are shown.")}</p>}
          </article>
        </section>

        <section className="lower-grid">
          <article className="telemetry-panel" id="telemetry">
            <div className="section-heading">
              <div><span className="panel-kicker">{tr("LATEST THAIWATER RESPONSE")}</span><h2>{tr("Five-district water gauges")}</h2></div>
              <span className="coverage-count">{data?.water?.stations.length ?? 0} {tr("stations")}</span>
            </div>

            <div className="live-gauge-list">
              <div className="live-gauge-row gauge-head"><span>{tr("Station")}</span><span>{tr("Level")}</span><span>{tr("Bank distance")}</span><span>{tr("Status")}</span></div>
              {(data?.water?.stations ?? []).map((station) => (
                <div className="live-gauge-row" key={station.id}>
                  <span><b>{station.name}</b><small>{displayDistrictName(station.district, language)} · {station.river} · {formatFeedTime(station.observedAt, language)}</small></span>
                  <span><b>{station.levelMsl.toFixed(2)} m</b><small>MSL · {station.levelMsl - station.previousLevelMsl >= 0 ? "+" : ""}{(station.levelMsl - station.previousLevelMsl).toFixed(2)} m</small></span>
                  <span><b>{station.bankDistanceM.toFixed(2)} m</b><small>{language === "en" ? station.bankDistanceText || tr("Reported difference") : tr("Reported difference")}</small></span>
                  <span><i className={`risk-badge ${station.situationLevel >= 5 ? "critical" : station.situationLevel >= 4 ? "warning" : station.situationLevel >= 3 ? "watch" : "normal"}`}>{levelLabel(station.situationLevel, language)}</i></span>
                </div>
              ))}
              {!data?.water && !loading && <p className="empty-state">{tr("ThaiWater feed unavailable. No substitute values are shown.")}</p>}
            </div>
          </article>

          <article className="district-panel" id="districts">
            <div className="section-heading">
              <div><span className="panel-kicker">{tr("FIVE TARGET DISTRICTS")}</span><h2>{tr("Feed coverage")}</h2></div>
              <span className="coverage-count">{tr("5 districts checked")}</span>
            </div>

            <div className="district-table" role="table" aria-label={tr("Official feed coverage for the five target districts")}>
              <div className="district-row table-head" role="row"><span>{tr("District")}</span><span>{tr("Rain 24h")}</span><span>{tr("Water")}</span><span aria-hidden="true" /></div>
              {districtRows.map((district) => (
                <div className="district-row" role="row" key={district.name}>
                  <span><i className={`status-mark ${district.maximumLevel >= 5 ? "critical" : district.maximumLevel >= 4 ? "warning" : district.gaugeCount ? "normal" : "unavailable"}`} /><b>{displayDistrictName(district.apiName, language)}</b><small>{localized(language, `${district.rainCount} rain / ${district.gaugeCount} water stations`, `မိုးရေစခန်း ${district.rainCount} / ရေတိုင်းစခန်း ${district.gaugeCount}`, `สถานีฝน ${district.rainCount} / สถานีระดับน้ำ ${district.gaugeCount}`)}</small></span>
                  <span><b>{district.rainCount ? `${district.maximumRain.toFixed(1)} mm` : "-"}</b><small>{tr(district.rainCount ? "Maximum" : "No station")}</small></span>
                  <span><i className={`risk-badge ${district.maximumLevel >= 5 ? "critical" : district.maximumLevel >= 4 ? "warning" : district.maximumLevel >= 3 ? "watch" : district.gaugeCount ? "normal" : "unavailable"}`}>{district.gaugeCount ? levelLabel(district.maximumLevel, language) : tr("No gauge")}</i></span>
                  <a href={data?.water?.sourceUrl ?? "https://www.thaiwater.net/"} target="_blank" rel="noreferrer" aria-label={localized(language, `Open ThaiWater for ${district.name}`, `${district.nameMy} အတွက် ThaiWater ဖွင့်ရန်`, `เปิด ThaiWater สำหรับอำเภอ${district.nameTh}`)}><ExternalLink size={15} /></a>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="data-caveat">
          <Info size={17} />
          <p><strong>{tr("Operational use:")}</strong> {tr("Feed values can be delayed, missing, or revised by the source agency. The DRR road dataset shown in source status is a 2022 archive, not current road passability. For current highway conditions use the official DOH hotline 1586 and agency bulletins.")}</p>
        </section>
      </div>

      <nav className="mobile-nav" aria-label={tr("Overview")}>
        <a className="active" href="#overview"><Map size={19} /><span>{tr("Overview")}</span></a>
        <a href="#alerts"><BellRing size={19} /><span>{tr("Water flags")}</span></a>
        <a href="#districts"><Gauge size={19} /><span>{tr("Districts")}</span></a>
        <a href="#sources"><Database size={19} /><span>{tr("Sources")}</span></a>
        <a className="request-help-nav" href="/request-help"><LifeBuoy size={19} /><span>{tr("Request Help")}</span></a>
        <a className="damage-nav" href="/damage-assessment"><ClipboardCheck size={19} /><span>{tr("Damage Assessment")}</span></a>
      </nav>

      <AlertSubscriptionDialog language={language} open={subscriptionOpen} onClose={() => setSubscriptionOpen(false)} />

      {drawerAlert && (
        <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setDrawerId(null); }}>
          <aside className="incident-drawer" role="dialog" aria-modal="true" aria-labelledby="incident-title">
            <div className="drawer-header">
              <div><span className={`severity-pill ${drawerAlert.severity}`}>{levelLabel(drawerAlert.station.situationLevel, language)}</span><small>{drawerAlert.id} - {drawerAlert.time}</small></div>
              <button className="icon-button" type="button" onClick={() => setDrawerId(null)} aria-label={tr("Close station details")} title={tr("Close details")}><X size={20} /></button>
            </div>
            <h2 id="incident-title">{drawerAlert.station.name}</h2>
            <p className="drawer-location"><MapPin size={16} /> {drawerAlert.district}, {tr("Tak Province")}</p>
            <p className="drawer-summary">{localized(language, `ThaiWater reports ${drawerAlert.detail}. The situation level is supplied by the source feed and should be checked against the latest agency bulletin.`, `ThaiWater ဒေတာအရ ${drawerAlert.detail}။ အခြေအနေအဆင့်ကို ရင်းမြစ်ဒေတာမှ ရယူထားပြီး သက်ဆိုင်ရာဌာန၏ နောက်ဆုံးကြေညာချက်နှင့် စစ်ဆေးရမည်။`, `ThaiWater รายงานว่า ${drawerAlert.detail} ระดับสถานการณ์มาจากข้อมูลต้นทางและควรตรวจสอบกับประกาศล่าสุดของหน่วยงาน`)}</p>

            <div className="drawer-stats">
              <span><small>{tr("Water level")}</small><strong>{drawerAlert.level}</strong><em>{drawerAlert.delta} {tr("from previous")}</em></span>
              <span><small>{tr("Bank distance")}</small><strong>{drawerAlert.station.bankDistanceM.toFixed(2)} m</strong><em>{language === "en" ? drawerAlert.station.bankDistanceText || tr("Source value") : tr("Reported difference")}</em></span>
            </div>

            <div className="official-detail-list">
              <span><small>{tr("Source agency")}</small><b>{drawerAlert.station.agency}</b></span>
              <span><small>{tr("Observed")}</small><b>{drawerAlert.time}</b></span>
              <span><small>{tr("River")}</small><b>{drawerAlert.station.river}</b></span>
              <span><small>{tr("Situation code")}</small><b>{drawerAlert.station.situationLevel}</b></span>
            </div>

            <div className="data-caveat compact"><Info size={16} /><p>{tr("Do not issue evacuation or road-closure instructions from this dashboard alone. Confirm with DDPM and the responsible local authority.")}</p></div>

            <div className="drawer-actions">
              <a className="primary" href={data?.water?.sourceUrl ?? "https://www.thaiwater.net/"} target="_blank" rel="noreferrer"><ExternalLink size={17} /> {tr("Open ThaiWater")}</a>
              <button type="button" onClick={() => setDrawerId(null)}>{tr("Close details")}</button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
