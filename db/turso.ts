import { createClient } from "@tursodatabase/serverless/compat";

let client: ReturnType<typeof createClient> | null = null;
let schemaReady: Promise<void> | null = null;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS help_requests (
    id TEXT PRIMARY KEY NOT NULL,
    reference TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    urgency TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    alternate_contact TEXT,
    preferred_language TEXT NOT NULL,
    district TEXT NOT NULL,
    village TEXT NOT NULL,
    location_details TEXT NOT NULL,
    latitude TEXT,
    longitude TEXT,
    people_count INTEGER NOT NULL,
    children_under_five INTEGER NOT NULL DEFAULT 0,
    older_adults INTEGER NOT NULL DEFAULT 0,
    disability_or_mobility_needs INTEGER NOT NULL DEFAULT 0,
    needs TEXT NOT NULL,
    details TEXT NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS help_requests_status_created_idx ON help_requests (status, created_at)",
  "CREATE INDEX IF NOT EXISTS help_requests_district_idx ON help_requests (district)",
  `CREATE TABLE IF NOT EXISTS damage_assessments (
    id TEXT PRIMARY KEY NOT NULL,
    reference TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    assessor_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    organization TEXT,
    observed_at TEXT NOT NULL,
    district TEXT NOT NULL,
    village TEXT NOT NULL,
    location_details TEXT NOT NULL,
    latitude TEXT,
    longitude TEXT,
    severity TEXT NOT NULL,
    access_status TEXT NOT NULL,
    water_present INTEGER NOT NULL DEFAULT 0,
    flood_depth_cm INTEGER NOT NULL DEFAULT 0,
    households_affected INTEGER NOT NULL DEFAULT 0,
    people_affected INTEGER NOT NULL DEFAULT 0,
    people_displaced INTEGER NOT NULL DEFAULT 0,
    people_injured INTEGER NOT NULL DEFAULT 0,
    structures_damaged INTEGER NOT NULL DEFAULT 0,
    structures_destroyed INTEGER NOT NULL DEFAULT 0,
    categories TEXT NOT NULL,
    hazards TEXT NOT NULL,
    evidence_url TEXT,
    description TEXT NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS damage_assessments_status_created_idx ON damage_assessments (status, created_at)",
  "CREATE INDEX IF NOT EXISTS damage_assessments_district_idx ON damage_assessments (district)",
  `CREATE TABLE IF NOT EXISTS warning_alerts (
    id TEXT PRIMARY KEY NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    severity TEXT NOT NULL,
    district TEXT NOT NULL,
    title_en TEXT NOT NULL,
    title_my TEXT NOT NULL,
    title_th TEXT NOT NULL,
    body_en TEXT NOT NULL,
    body_my TEXT NOT NULL,
    body_th TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT,
    observed_at TEXT,
    created_at TEXT NOT NULL,
    published_at TEXT,
    expires_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    trigger_key TEXT UNIQUE,
    auto_generated INTEGER NOT NULL DEFAULT 0
  )`,
  "CREATE INDEX IF NOT EXISTS warning_alerts_status_published_idx ON warning_alerts (status, published_at)",
  "CREATE INDEX IF NOT EXISTS warning_alerts_district_expires_idx ON warning_alerts (district, expires_at)",
  `CREATE TABLE IF NOT EXISTS alert_subscriptions (
    id TEXT PRIMARY KEY NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    district TEXT NOT NULL,
    language TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    consented_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_error TEXT
  )`,
  "CREATE INDEX IF NOT EXISTS alert_subscriptions_active_district_idx ON alert_subscriptions (active, district)",
  `CREATE TABLE IF NOT EXISTS alert_deliveries (
    id TEXT PRIMARY KEY NOT NULL,
    alert_id TEXT NOT NULL,
    subscription_id TEXT NOT NULL,
    status TEXT NOT NULL,
    attempted_at TEXT NOT NULL,
    response_code INTEGER,
    error TEXT
  )`,
  "CREATE INDEX IF NOT EXISTS alert_deliveries_alert_idx ON alert_deliveries (alert_id, attempted_at)",
];

export function getDatabase() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured.");
  }

  client ??= createClient({ url, authToken });
  return client;
}

export function ensureDatabaseSchema() {
  const database = getDatabase();
  schemaReady ??= database.batch(
    schemaStatements.map((sql) => ({ sql, args: [] })),
    "write",
  ).then(() => undefined).catch((error: unknown) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

export async function checkDatabaseHealth() {
  await ensureDatabaseSchema();
  const result = await getDatabase().execute("SELECT 1 AS ok");
  return Number(result.rows[0]?.ok) === 1;
}
