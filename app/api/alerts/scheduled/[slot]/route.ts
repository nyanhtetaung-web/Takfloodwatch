import {
  listPublishedAlerts,
  listPublishedAlertsForRenewal,
  pruneAlertDeliveryWindows,
  renewWarningAlert,
  type AlertDistrict,
  type WarningAlertRecord,
} from "../../../../../db/earlyWarnings";
import { isAlertEvaluator } from "../../../../lib/alertAuth";
import { deliverWarningAlert } from "../../../../lib/pushAlerts";
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

function isThaiWaterAlert(alert: WarningAlertRecord) {
  return `${alert.sourceName} ${alert.sourceUrl ?? ""}`.toLowerCase().includes("thaiwater");
}

function matchingSituationLevel(alert: WarningAlertRecord, flags: ActiveFlag[]) {
  return flags.reduce((highest, flag) => {
    if (alert.district !== "All districts" && alert.district !== flag.district) return highest;
    return Math.max(highest, flag.situationLevel);
  }, 0);
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
  const renewedUntil = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

  for (const alert of renewalCandidates) {
    if (renewedDistricts.has(alert.district) || !isThaiWaterAlert(alert)) continue;
    const situationLevel = matchingSituationLevel(alert, activeFlags);
    const requiredLevel = alert.severity === "critical" ? 5 : 4;
    if (situationLevel < requiredLevel) continue;
    if (await renewWarningAlert(alert.id, renewedUntil)) renewedAlerts.push(alert.id);
    renewedDistricts.add(alert.district);
  }

  const publishedAlerts = await listPublishedAlerts();
  const latestByDistrict = new Map<string, (typeof publishedAlerts)[number]>();
  for (const alert of publishedAlerts) {
    if (!latestByDistrict.has(alert.district)) latestByDistrict.set(alert.district, alert);
  }

  const windowKey = `${dateInBangkok()}-${slot}`;
  const reminders = await Promise.all(Array.from(latestByDistrict.values(), async (alert) => ({
    alertId: alert.id,
    district: alert.district,
    severity: alert.severity,
    delivery: await deliverWarningAlert(alert, { windowKey }),
  })));

  return Response.json({
    scheduledAt: new Date().toISOString(),
    thailandWindow: `${slot}:00`,
    windowKey,
    evaluation,
    renewedAlerts,
    renewedUntil: renewedAlerts.length > 0 ? renewedUntil : null,
    activePublishedWarnings: publishedAlerts.length,
    reminderAlerts: reminders.length,
    reminders,
  }, { headers: { "Cache-Control": "no-store" } });
}
