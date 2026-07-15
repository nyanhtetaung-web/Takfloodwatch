# FloodWatch Tak

FloodWatch Tak is a trilingual flood operations dashboard for Mae Sot, Umphang, Tha Song Yang, Mae Ramat, and Phop Phra. It includes government weather and water feeds, an interactive satellite map, help and damage-report forms, and opt-in browser warnings.

## Runtime

- Next.js on Vercel
- Turso Cloud for reports, subscriptions, alerts, and delivery records
- `@tursodatabase/serverless` for the remote database connection
- Vercel Cron for government-feed draft evaluation

## Required environment variables

Set these in Vercel Project Settings for Production, Preview, and Development as appropriate:

- `TURSO_DATABASE_URL`: the database URL returned by Turso
- `TURSO_AUTH_TOKEN`: a read/write token for that database
- `VAPID_PUBLIC_KEY`: the public Web Push key
- `VAPID_PRIVATE_KEY`: the matching private Web Push key
- `VAPID_SUBJECT`: the deployed HTTPS URL or a `mailto:` contact
- `ALERT_ADMIN_TOKEN`: a long private token for `/alerts-admin`
- `CRON_SECRET`: a separate token for Vercel Cron
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

## Operational notes

Help and damage reports contain names, phone numbers, and locations. Restrict database access, define a retention policy, and limit alert-publishing access before public use.

Government endpoints can be delayed, unavailable, or revised. Confirm important readings with the source agency and local authorities before field action.

The scheduled evaluator only creates draft warnings. An authorized staff member must review and publish all three language versions before notifications are sent.
