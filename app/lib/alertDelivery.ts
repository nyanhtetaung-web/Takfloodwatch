import type { WarningAlertRecord } from "../../db/earlyWarnings";
import { deliverLineWarningAlert } from "./lineAlerts";
import { deliverWarningAlert } from "./pushAlerts";

export async function deliverWarningAcrossChannels(alert: WarningAlertRecord, options: { windowKey?: string } = {}) {
  const [webPush, line] = await Promise.all([
    deliverWarningAlert(alert, options),
    deliverLineWarningAlert(alert, options),
  ]);
  return {
    webPush,
    line,
    recipients: webPush.recipients + line.recipients,
    attempted: webPush.attempted + line.attempted,
    sent: webPush.sent + line.sent,
    failed: webPush.failed + line.failed,
    skipped: webPush.skipped + line.skipped,
  };
}
