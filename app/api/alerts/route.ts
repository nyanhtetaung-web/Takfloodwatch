import { alertDistricts, listPublishedAlerts, type AlertDistrict } from "../../../db/earlyWarnings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const districtParam = new URL(request.url).searchParams.get("district") ?? "All districts";
  const district = alertDistricts.includes(districtParam as AlertDistrict) ? districtParam as AlertDistrict : "All districts";
  const alerts = await listPublishedAlerts(district);
  return Response.json({ alerts, generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
