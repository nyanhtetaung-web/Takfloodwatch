# FloodWatch Tak

FloodWatch Tak is a trilingual flood operations dashboard for Mae Sot, Umphang, Tha Song Yang, Mae Ramat, and Phop Phra. It includes government weather and water feeds, an interactive satellite map, help and damage-report forms, and opt-in browser and LINE warnings.

## Runtime

- Next.js on Vercel
- Turso Cloud for reports, subscriptions, alerts, and delivery records
- `@tursodatabase/serverless` for the remote database connection
- Vercel Cron for government-feed evaluation and scheduled active-warning reminders

## Required environment variables

Set these in Vercel Project Settings for Production, Preview, and Development as appropriate:

- `TURSO_DATABASE_URL`: the database URL returned by Turso
- `TURSO_AUTH_TOKEN`: a read/write token for that database
- `VAPID_PUBLIC_KEY`: the public Web Push key
- `VAPID_PRIVATE_KEY`: the matching private Web Push key
- `VAPID_SUBJECT`: the deployed HTTPS URL or a `mailto:` contact
- `ALERT_ADMIN_TOKEN`: a long private token for `/alerts-admin`
- `CRON_SECRET`: a separate token for Vercel Cron
- `LINE_CHANNEL_SECRET`: the Messaging API channel secret from LINE Developers
- `LINE_CHANNEL_ACCESS_TOKEN`: a long-lived Messaging API channel access token
- `LINE_ADD_FRIEND_URL`: the public add-friend link for the Tak FloodWatch Official Account
- `NEXT_PUBLIC_SITE_URL`: the canonical deployed dashboard URL, such as `https://takfloodwatch.vercel.app`
- `TMD_NWP_API_TOKEN` (optional): a personal TMD Weather Forecast API OAuth token. When set, the five district point forecasts use official TMD NWP data. Without it, live multi-model point guidance is shown with the official TMD Tak forecast retained as the province reference.

Never commit real tokens or `.env` files. The application creates its SQLite-compatible tables and indexes when the database is first accessed. `database-schema.sql` is included for review or manual initialization.

## Health check

After deployment, open `/api/health`. A healthy deployment returns HTTP 200 and a response shaped like:

```json
{
  "status": "ok",
  "database": "connected",
  "service": "floodwatch-tak",
  "timestamp": "2026-07-14T00:00:00.000Z",
  "latencyMs": 42
}
```

A missing or unreachable Turso database returns HTTP 503 with `database: "disconnected"`.

## Local development

1. Copy `.env.example` to `.env.local` and provide development credentials.
2. Install dependencies with `pnpm install`.
3. Run `pnpm dev`.
4. Verify `http://localhost:3000/api/health` before testing forms or warning subscriptions.

## Deployment workflow

1. Push this folder as the root of a GitHub repository.
2. Import that repository from Vercel's New Project screen.
3. Add all required environment variables before the first production deployment.
4. Deploy and verify `/api/health`.

Every push to the production branch triggers a new production deployment. Vercel also creates preview deployments for other branches and pull requests.

## LINE Messaging API

1. Create a LINE Official Account and enable Messaging API.
2. Add the four LINE variables above to the Vercel Production environment and redeploy.
3. In LINE Developers, set the webhook URL to `https://takfloodwatch.vercel.app/api/channels/line/webhook`.
4. Enable **Use webhook**, select **Verify**, and confirm the endpoint succeeds.
5. Add the Official Account from the dashboard and send `EN`, `MY`, or `TH` to select a language. Send `ALL`, `MAE SOT`, `UMPHANG`, `THA SONG YANG`, `MAE RAMAT`, or `PHOP PHRA` to select an area. Send `STOP` to unsubscribe.

The webhook rejects requests without a valid LINE signature. Adding the Official Account enables alerts for all five districts in English and immediately sends the current active warning, if one exists. Scheduled warnings are deduplicated independently for Web Push and LINE.

## Operational notes

Help and damage reports contain names, phone numbers, and locations. Restrict database access, define a retention policy, and limit alert-publishing access before public use.

Government endpoints can be delayed, unavailable, or revised. Confirm important readings with the source agency and local authorities before field action.

Four scheduled alert cycles run in approximate Thailand-time windows around 01:00, 07:00, 13:00, and 19:00. Each cycle evaluates government feeds and creates idempotent drafts. It also repeats the latest active, staff-approved warning for each affected district, at most once per subscriber per window. No all-clear message or unreviewed draft is pushed automatically.

When a staff-approved ThaiWater warning matches a continuing level 4-5 government-feed flag, each scheduled cycle extends that warning for another 12 hours. Critical warnings require a continuing level 5 flag. Only the newest matching warning per district is renewed, and a warning that has been expired for more than 24 hours cannot be revived automatically. When the official flag clears, renewal stops and the warning expires naturally.

The Vercel configuration uses four distinct once-daily cron paths because Hobby projects allow a given cron job to run only once per day. Cron execution can occur at any point within the configured hour.
