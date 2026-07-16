import { createHmac, timingSafeEqual } from "node:crypto";
import {
  alertDistricts,
  alertLanguages,
  deactivateLineAlertSubscription,
  getLineAlertSubscription,
  listPublishedAlerts,
  updateLineAlertSubscription,
  upsertLineAlertSubscription,
  type AlertDistrict,
  type AlertLanguage,
  type LineAlertSubscriptionRecord,
} from "../../../../../db/earlyWarnings";
import { deliverLineWarningAlert, sendLineReply } from "../../../../lib/lineAlerts";

export const dynamic = "force-dynamic";

type LineSource = { type?: string; userId?: string };
type LineEvent = {
  type?: string;
  replyToken?: string;
  source?: LineSource;
  message?: { type?: string; text?: string };
  postback?: { data?: string };
};

function validSignature(body: string, provided: string, secret: string) {
  if (!provided || !secret) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(body).digest("base64"));
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function languageFromText(text: string): AlertLanguage | undefined {
  if (/\b(my|mm|burmese|myanmar)\b|မြန်မာ/u.test(text)) return "my";
  if (/\b(th|thai)\b|ไทย/u.test(text)) return "th";
  if (/\b(en|english)\b/u.test(text)) return "en";
  return undefined;
}

function districtFromText(text: string): AlertDistrict | undefined {
  const choices: Array<[RegExp, AlertDistrict]> = [
    [/\b(all|all districts|five districts)\b|ทั้งหมด|ทุกอำเภอ/u, "All districts"],
    [/\b(mae sot|maesot)\b|แม่สอด/u, "Mae Sot"],
    [/\b(umphang|um phang)\b|อุ้มผาง/u, "Umphang"],
    [/\b(tha song yang|thasongyang)\b|ท่าสองยาง/u, "Tha Song Yang"],
    [/\b(mae ramat|maeramat)\b|แม่ระมาด/u, "Mae Ramat"],
    [/\b(phop phra|phophra)\b|พบพระ/u, "Phop Phra"],
  ];
  return choices.find(([pattern]) => pattern.test(text))?.[1];
}

function localizedResponse(subscription: LineAlertSubscriptionRecord, stopped = false) {
  if (stopped) {
    if (subscription.language === "my") return "FloodWatch LINE သတိပေးချက်များကို ရပ်ထားပါသည်။ ပြန်လည်ရယူရန် START ဟု ပို့ပါ။";
    if (subscription.language === "th") return "หยุดการแจ้งเตือน FloodWatch ทาง LINE แล้ว ส่ง START เพื่อเปิดใช้งานอีกครั้ง";
    return "FloodWatch LINE alerts are stopped. Send START to enable them again.";
  }
  if (subscription.language === "my") {
    return `FloodWatch LINE သတိပေးချက်များကို ဖွင့်ထားပါသည်။\nဧရိယာ: ${subscription.district}\nဘာသာစကား: မြန်မာ\n\nဧရိယာပြောင်းရန် ALL, MAE SOT, UMPHANG, THA SONG YANG, MAE RAMAT သို့မဟုတ် PHOP PHRA ဟု ပို့ပါ။ ရပ်ရန် STOP ဟု ပို့ပါ။`;
  }
  if (subscription.language === "th") {
    return `เปิดการแจ้งเตือน FloodWatch ทาง LINE แล้ว\nพื้นที่: ${subscription.district}\nภาษา: ไทย\n\nส่ง ALL, MAE SOT, UMPHANG, THA SONG YANG, MAE RAMAT หรือ PHOP PHRA เพื่อเปลี่ยนพื้นที่ ส่ง STOP เพื่อหยุด`;
  }
  return `FloodWatch LINE alerts are active.\nArea: ${subscription.district}\nLanguage: English\n\nSend EN, MY, or TH to change language. Send ALL, MAE SOT, UMPHANG, THA SONG YANG, MAE RAMAT, or PHOP PHRA to change area. Send STOP to unsubscribe.`;
}

async function deliverCurrentWarnings(subscription: LineAlertSubscriptionRecord) {
  const alerts = await listPublishedAlerts(subscription.district);
  const latestByDistrict = new Map<string, (typeof alerts)[number]>();
  for (const alert of alerts) {
    if (!latestByDistrict.has(alert.district)) latestByDistrict.set(alert.district, alert);
  }
  await Promise.all(Array.from(latestByDistrict.values(), (alert) => deliverLineWarningAlert(alert, {
    subscriptions: [subscription],
  })));
}

async function processFollow(event: LineEvent, userId: string) {
  const subscription = await upsertLineAlertSubscription(userId);
  if (event.replyToken) await sendLineReply(event.replyToken, [localizedResponse(subscription)]);
  await deliverCurrentWarnings(subscription);
}

async function processMessage(event: LineEvent, userId: string) {
  if (event.message?.type !== "text") return;
  const text = (event.message.text ?? "").trim().toLowerCase();
  const current = await getLineAlertSubscription(userId) ?? await upsertLineAlertSubscription(userId);
  const stop = /^(stop|unsubscribe|cancel|หยุด)$/u.test(text);
  if (stop) {
    const subscription = await updateLineAlertSubscription(userId, { active: false });
    if (event.replyToken) await sendLineReply(event.replyToken, [localizedResponse(subscription, true)]);
    return;
  }

  const language = languageFromText(text);
  const district = districtFromText(text);
  const start = /^(start|subscribe|alerts?|เริ่ม)$/u.test(text) || text.startsWith("subscribe ");
  const subscription = await updateLineAlertSubscription(userId, {
    language: language && alertLanguages.includes(language) ? language : current.language,
    district: district && alertDistricts.includes(district) ? district : current.district,
    active: start || language != null || district != null ? true : current.active,
  });
  if (event.replyToken) await sendLineReply(event.replyToken, [localizedResponse(subscription)]);
  if (start && !current.active) await deliverCurrentWarnings(subscription);
}

async function processPostback(event: LineEvent, userId: string) {
  const parameters = new URLSearchParams(event.postback?.data ?? "");
  const language = parameters.get("language") as AlertLanguage | null;
  const district = parameters.get("district") as AlertDistrict | null;
  const subscription = await updateLineAlertSubscription(userId, {
    language: language && alertLanguages.includes(language) ? language : undefined,
    district: district && alertDistricts.includes(district) ? district : undefined,
    active: true,
  });
  if (event.replyToken) await sendLineReply(event.replyToken, [localizedResponse(subscription)]);
}

async function processEvent(event: LineEvent) {
  const userId = event.source?.type === "user" ? event.source.userId : undefined;
  if (!userId) return;
  if (event.type === "follow") return processFollow(event, userId);
  if (event.type === "unfollow") return deactivateLineAlertSubscription(userId, "LINE account unfollowed");
  if (event.type === "message") return processMessage(event, userId);
  if (event.type === "postback") return processPostback(event, userId);
}

export function GET() {
  return Response.json({
    service: "FloodWatch LINE webhook",
    configured: Boolean(process.env.LINE_CHANNEL_SECRET && process.env.LINE_CHANNEL_ACCESS_TOKEN),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const secret = process.env.LINE_CHANNEL_SECRET ?? "";
  if (!secret || !process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    return Response.json({ error: "LINE delivery is not configured." }, { status: 503 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 256_000) {
    return Response.json({ error: "Webhook payload is too large." }, { status: 413 });
  }

  const body = await request.text();
  if (!validSignature(body, request.headers.get("x-line-signature") ?? "", secret)) {
    return Response.json({ error: "Invalid LINE signature." }, { status: 401 });
  }

  let payload: { events?: LineEvent[] };
  try {
    payload = JSON.parse(body) as { events?: LineEvent[] };
  } catch {
    return Response.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const results = await Promise.allSettled((payload.events ?? []).map(processEvent));
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) console.error(`[line-webhook] ${failures.length} event(s) failed`);
  return Response.json({ accepted: true, events: results.length }, { headers: { "Cache-Control": "no-store" } });
}
