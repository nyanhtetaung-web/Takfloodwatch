import {
  expireWarningAlert,
  listPublishedAlerts,
  listPublishedAlertsForRenewal,
  pruneAlertDeliveryWindows,
  renewWarningAlert,
  type AlertDistrict,
  type WarningAlertRecord,
} from "../../../../../db/earlyWarnings";
import { isAlertEvaluator } from "../../../../lib/alertAuth";
import { deliverWarningAcrossChannels } from "../../../../lib/alertDelivery";
import { deliverLineDistrictForecast } from "../../../../lib/lineAlerts";
import { isThaiWaterWarning } from "../../../../lib/waterAlertPolicy";
import { GET as evaluateGovernmentFeeds } from "../../evaluate/route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const alertSlots = new Set(["01", "07", "13", "19"]);

type ActiveFlag = {
  stationCode: string;
  district: AlertDistrict;
  situationLevel: number;
  observedAt: string;
};

function matchingEmergencyFlag(alert: WarningAlertRecord, flags: ActiveFlag[]) {
  if (alert.district === "All districts") return null;
  return flags.reduce<ActiveFlag | null>((highest, flag) => {
    if (alert.district !== flag.district) return highest;
    if (!highest || flag.situationLevel > highest.situationLevel) return flag;
    return highest;
  }, null);
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

export async function GET(request: Request, context: { params: Promise<{ slot: string }> }) {
  if (!await isAlertEvaluator(request)) {
    return Response.json({ error: "Evaluator authorization is required." }, { status: 401 });
  }

  const { slot } = await context.params;
  if (!alertSlots.has(slot)) {
    return Response.json({ error: "Unknown scheduled alert window." }, { status: 404 });
  }

  const evaluationResponse = await evaluateGovernmentFeeds(request);
  const evaluation = await evaluationResponse.json() as Record<string, unknown> & { activeFlags?: ActiveFlag[] };
  if (!evaluationResponse.ok) {
    return Response.json({ slot, evaluation }, { status: evaluationResponse.status });
  }

  await pruneAlertDeliveryWindows(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());
  const activeFlags = Array.isArray(evaluation.activeFlags) ? evaluation.activeFlags : [];
  const renewalCandidates = await listPublishedAlertsForRenewal();
  const renewedDistricts = new Set<string>();
  const renewedAlerts: string[] = [];
  const expiredAlerts: string[] = [];
  const renewedUntil = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

  for (const alert of renewalCandidates) {
    if (!isThaiWaterWarning(alert)) continue;
    const emergencyFlag = matchingEmergencyFlag(alert, activeFlags);
    if (renewedDistricts.has(alert.district) || !emergencyFlag) {
      await expireWarningAlert(alert.id);
      expiredAlerts.push(alert.id);
      continue;
    }
    if (await renewWarningAlert(alert.id, renewedUntil, emergencyFlag.observedAt)) renewedAlerts.push(alert.id);
    renewedDistricts.add(alert.district);
  }

  const publishedAlerts = await listPublishedAlerts();
  const latestByDistrict = new Map<string, (typeof publishedAlerts)[number]>();
  for (const alert of publishedAlerts) {
    if (!latestByDistrict.has(alert.district)) latestByDistrict.set(alert.district, alert);
  }

  const windowKey = `${dateInBangkok()}-${slot}`;
  const forecastDelivery = publishedAlerts.length === 0
    ? await deliverLineDistrictForecast(windowKey)
    : null;
  const reminders = await Promise.all(Array.from(latestByDistrict.values(), async (alert) => ({
    alertId: alert.id,
    district: alert.district,
    severity: alert.severity,
    delivery: await deliverWarningAcrossChannels(alert, { windowKey }),
  })));

  console.info("[scheduled-alerts]", JSON.stringify({ slot, windowKey, forecastDelivery, reminders }));

  return Response.json({
    scheduledAt: new Date().toISOString(),
    thailandWindow: `${slot}:00`,
    windowKey,
    evaluation,
    renewedAlerts,
    expiredAlerts,
    renewedUntil: renewedAlerts.length > 0 ? renewedUntil : null,
    activePublishedWarnings: publishedAlerts.length,
    forecastDelivery,
    reminderAlerts: reminders.length,
    reminders,
  }, { headers: { "Cache-Control": "no-store" } });
}
