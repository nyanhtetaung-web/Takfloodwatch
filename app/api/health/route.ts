import { checkDatabaseHealth } from "../../../db/turso";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    const connected = await checkDatabaseHealth();
    if (!connected) throw new Error("Unexpected database response");

    return Response.json({
      status: "ok",
      database: "connected",
      service: "floodwatch-tak",
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({
      status: "error",
      database: "disconnected",
      service: "floodwatch-tak",
      timestamp: new Date().toISOString(),
    }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
