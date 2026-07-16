import {
  alertDistricts,
  alertLanguages,
  deactivateAlertSubscription,
  listPublishedAlerts,
  upsertAlertSubscription,
  type AlertDistrict,
  type AlertLanguage,
} from "../../../db/earlyWarnings";
import { deliverWarningAlert } from "../../lib/pushAlerts";

export const dynamic = "force-dynamic";

function text(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 12_000) {
    return Response.json({ error: "Subscription is too large." }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid subscription." }, { status: 400 });
  }

  const district = text(body.district, 40) as AlertDistrict;
  const language = text(body.language, 8) as AlertLanguage;
  const subscription = body.subscription && typeof body.subscription === "object" ? body.subscription as Record<string, unknown> : {};
  const keys = subscription.keys && typeof subscription.keys === "object" ? subscription.keys as Record<string, unknown> : {};
  const endpoint = text(subscription.endpoint, 2_000);
  const p256dh = text(keys.p256dh, 512);
  const auth = text(keys.auth, 512);

  if (!alertDistricts.includes(district) || !alertLanguages.includes(language) || body.consent !== true) {
    return Response.json({ error: "District, language, and consent are required." }, { status: 400 });
  }
  try {
    const endpointUrl = new URL(endpoint);
    if (endpointUrl.protocol !== "https:") throw new Error("Push endpoint must use HTTPS");
  } catch {
    return Response.json({ error: "Invalid push endpoint." }, { status: 400 });
  }
  if (!p256dh || !auth) {
    return Response.json({ error: "Push encryption keys are missing." }, { status: 400 });
  }

  const savedSubscription = await upsertAlertSubscription({ id: crypto.randomUUID(), endpoint, p256dh, auth, district, language });
  const activeAlerts = await listPublishedAlerts(district);
  const latestByDistrict = new Map<string, (typeof activeAlerts)[number]>();
  for (const alert of activeAlerts) {
    if (!latestByDistrict.has(alert.district)) latestByDistrict.set(alert.district, alert);
  }
  const deliveries = await Promise.all(Array.from(latestByDistrict.values(), (alert) => deliverWarningAlert(alert, {
    subscriptions: [savedSubscription],
  })));
  const catchUp = deliveries.reduce((summary, delivery) => ({
    alerts: summary.alerts + 1,
    sent: summary.sent + delivery.sent,
    failed: summary.failed + delivery.failed,
    skipped: summary.skipped + delivery.skipped,
  }), { alerts: 0, sent: 0, failed: 0, skipped: 0 });

  return Response.json({ subscribed: true, district, language, catchUp }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const endpoint = text(body.endpoint, 2_000);
  if (!endpoint) return Response.json({ error: "Endpoint is required." }, { status: 400 });
  await deactivateAlertSubscription(endpoint, "Unsubscribed by user");
  return Response.json({ subscribed: false }, { headers: { "Cache-Control": "no-store" } });
}
