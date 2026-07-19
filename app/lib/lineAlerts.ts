import {
  claimAlertDeliveryWindow,
  listLineSubscriptionsForAlert,
  recordAlertDelivery,
  type LineAlertSubscriptionRecord,
  type WarningAlertRecord,
} from "../../db/earlyWarnings";
import {
  fetchTakDistrictForecasts,
  type DistrictCondition,
  type TakDistrictForecastResult,
} from "./takDistrictForecasts";

class LineApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

function dashboardUrl(alertId?: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const deployment = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://takfloodwatch.vercel.app";
  return alertId ? `${configured ?? deployment}/?warning=${encodeURIComponent(alertId)}` : configured ?? deployment;
}

async function lineRequest(path: string, payload: unknown) {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) throw new LineApiError(503, "LINE delivery is not configured.");

  const response = await fetch(`https://api.line.me${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = (await response.text()).replace(/\s+/g, " ").trim().slice(0, 300);
    throw new LineApiError(response.status, detail || `LINE API returned ${response.status}.`);
  }
  return response;
}

export async function sendLineReply(replyToken: string, texts: string[]) {
  if (!replyToken || texts.length === 0) return;
  await lineRequest("/v2/bot/message/reply", {
    replyToken,
    messages: texts.slice(0, 5).map((text) => ({ type: "text", text: text.slice(0, 5000) })),
  });
}

export async function sendLinePushText(userId: string, text: string) {
  await lineRequest("/v2/bot/message/push", {
    to: userId,
    messages: [{ type: "text", text: text.slice(0, 5000) }],
  });
}

function dateInBangkok() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const districtNames: Record<string, string> = {
  "Mae Sot District": "Mae Sot / မဲဆောက် / แม่สอด",
  "Umphang District": "Umphang / အုန်းဖန် / อุ้มผาง",
  "Tha Song Yang District": "Tha Song Yang / သာဆောင်ယန်း / ท่าสองยาง",
  "Mae Ramat District": "Mae Ramat / မယ်ရမတ် / แม่ระมาด",
  "Phop Phra District": "Phop Phra / ဖုတ်ဖရ / พบพระ",
};

const conditionNames: Record<DistrictCondition, string> = {
  clear: "Clear / ကြည်လင် / ท้องฟ้าแจ่มใส",
  "partly-cloudy": "Partly cloudy / တိမ်အနည်းငယ် / มีเมฆบางส่วน",
  cloudy: "Cloudy / တိမ်ထူ / มีเมฆ",
  overcast: "Overcast / တိမ်အုံ့ / เมฆมาก",
  fog: "Fog / မြူ / หมอก",
  "light-rain": "Light rain / မိုးဖွဲ / ฝนเล็กน้อย",
  "moderate-rain": "Moderate rain / မိုးအသင့်အတင့် / ฝนปานกลาง",
  "heavy-rain": "Heavy rain / မိုးသည်းထန် / ฝนตกหนัก",
  thunderstorm: "Thunderstorm / မိုးကြိုးမုန်တိုင်း / พายุฝนฟ้าคะนอง",
  unknown: "Forecast unavailable / ခန့်မှန်းချက်မရ / ไม่มีข้อมูลพยากรณ์",
};

function districtForecastLines(result: TakDistrictForecastResult | null) {
  if (!result) return [
    "Five-district forecast temporarily unavailable; check the dashboard.",
    "ခရိုင်ငါးခု မိုးလေဝသခန့်မှန်းချက်ကို ယာယီမရနိုင်ပါ။ Dashboard တွင် စစ်ဆေးပါ။",
    "พยากรณ์ทั้งห้าอำเภอไม่พร้อมใช้งานชั่วคราว โปรดตรวจสอบที่แดชบอร์ด",
  ];

  const today = dateInBangkok();
  return result.forecasts.map((forecast) => {
    const day = forecast.days.find((item) => item.date >= today) ?? forecast.days[0];
    if (!day) return `${districtNames[forecast.district] ?? forecast.district}: unavailable`;
    const rain = day.rainChancePercent == null
      ? `${day.precipitationMm.toFixed(1)} mm`
      : `${day.rainChancePercent}% / ${day.precipitationMm.toFixed(1)} mm`;
    return `${districtNames[forecast.district] ?? forecast.district}: ${conditionNames[day.condition]} | Rain/မိုး/ฝน ${rain} | ${day.minimumTemperatureC.toFixed(0)}-${day.maximumTemperatureC.toFixed(0)} C`;
  });
}

function warningMessage(alert: WarningAlertRecord, districtForecast: TakDistrictForecastResult | null) {
  const weather = districtForecastLines(districtForecast);
  return [
    "FLOODWATCH TAK - EARLY WARNING",
    `ENGLISH\n${alert.titleEn}\n${alert.bodyEn}`,
    `မြန်မာ\n${alert.titleMy}\n${alert.bodyMy}`,
    `ไทย\n${alert.titleTh}\n${alert.bodyTh}`,
    "5-DISTRICT WEATHER / ခရိုင် ၅ ခု မိုးလေဝသ / พยากรณ์ 5 อำเภอ",
    ...weather,
    `Forecast source / ခန့်မှန်းရင်းမြစ် / แหล่งพยากรณ์: ${districtForecast?.source.shortName ?? "unavailable"}${districtForecast?.source.official ? " (official)" : " (model guidance)"}${districtForecast ? ` - ${districtForecast.source.sourceUrl}` : ""}`,
    `Area / ဧရိယာ / พื้นที่: ${alert.district}`,
    `Source / အရင်းအမြစ် / แหล่งข้อมูล: ${alert.sourceName}`,
    `Details / အသေးစိတ် / รายละเอียด: ${dashboardUrl(alert.id)}`,
  ].join("\n\n");
}

export async function deliverLineWarningAlert(
  alert: WarningAlertRecord,
  options: { windowKey?: string; subscriptions?: LineAlertSubscriptionRecord[] } = {},
) {
  const subscriptions = options.subscriptions ?? await listLineSubscriptionsForAlert(alert.district);
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    return { configured: false, recipients: subscriptions.length, attempted: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const districtForecast = await fetchTakDistrictForecasts().catch(() => null);
  const message = warningMessage(alert, districtForecast);

  let sent = 0;
  let failed = 0;
  let attempted = 0;
  let skipped = 0;

  for (let offset = 0; offset < subscriptions.length; offset += 20) {
    const batch = subscriptions.slice(offset, offset + 20);
    await Promise.all(batch.map(async (subscription) => {
      if (options.windowKey && !await claimAlertDeliveryWindow(alert.id, subscription.id, `line:${options.windowKey}`)) {
        skipped += 1;
        return;
      }
      attempted += 1;
      try {
        await sendLinePushText(subscription.userId, message);
        sent += 1;
        await recordAlertDelivery({
          alertId: alert.id,
          subscriptionId: subscription.id,
          status: "sent",
          responseCode: 200,
          error: null,
        });
      } catch (caught) {
        failed += 1;
        const error = caught as { statusCode?: number; message?: string };
        await recordAlertDelivery({
          alertId: alert.id,
          subscriptionId: subscription.id,
          status: "failed",
          responseCode: error.statusCode ?? null,
          error: error.message?.slice(0, 500) ?? "LINE delivery failed",
        });
      }
    }));
  }

  return { configured: true, recipients: subscriptions.length, attempted, sent, failed, skipped };
}
