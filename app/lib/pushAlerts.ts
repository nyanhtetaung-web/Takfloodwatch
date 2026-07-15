import * as webPush from "web-push";
import {
  claimAlertDeliveryWindow,
  deactivateAlertSubscription,
  listSubscriptionsForAlert,
  recordAlertDelivery,
  type AlertLanguage,
  type WarningAlertRecord,
} from "../../db/earlyWarnings";

function localizedAlert(alert: WarningAlertRecord, language: AlertLanguage) {
  if (language === "my") return { title: alert.titleMy, body: alert.bodyMy };
  if (language === "th") return { title: alert.titleTh, body: alert.bodyTh };
  return { title: alert.titleEn, body: alert.bodyEn };
}

export async function deliverWarningAlert(alert: WarningAlertRecord, options: { windowKey?: string } = {}) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  const subscriptions = await listSubscriptionsForAlert(alert.district);

  if (!publicKey || !privateKey || !subject) {
    return { configured: false, recipients: subscriptions.length, attempted: 0, sent: 0, failed: 0, skipped: 0 };
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  let sent = 0;
  let failed = 0;
  let attempted = 0;
  let skipped = 0;

  for (let offset = 0; offset < subscriptions.length; offset += 20) {
    const batch = subscriptions.slice(offset, offset + 20);
    await Promise.all(batch.map(async (subscription) => {
      if (options.windowKey && !await claimAlertDeliveryWindow(alert.id, subscription.id, options.windowKey)) {
        skipped += 1;
        return;
      }
      attempted += 1;
      const message = localizedAlert(alert, subscription.language);
      const payload = JSON.stringify({
        title: message.title,
        body: message.body,
        severity: alert.severity,
        district: alert.district,
        url: `/?warning=${encodeURIComponent(alert.id)}`,
      });

      try {
        const response = await webPush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, payload, { TTL: 900, urgency: alert.severity === "critical" ? "high" : "normal" });
        sent += 1;
        await recordAlertDelivery({ alertId: alert.id, subscriptionId: subscription.id, status: "sent", responseCode: response.statusCode ?? null, error: null });
      } catch (caught) {
        failed += 1;
        const error = caught as { statusCode?: number; message?: string };
        const statusCode = error.statusCode ?? null;
        const message = error.message?.slice(0, 500) ?? "Push delivery failed";
        if (statusCode === 404 || statusCode === 410) {
          await deactivateAlertSubscription(subscription.endpoint, message);
        }
        await recordAlertDelivery({ alertId: alert.id, subscriptionId: subscription.id, status: "failed", responseCode: statusCode, error: message });
      }
    }));
  }

  return { configured: true, recipients: subscriptions.length, attempted, sent, failed, skipped };
}
