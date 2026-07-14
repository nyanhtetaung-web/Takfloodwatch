import { createHelpRequest } from "../../../db/helpRequests";

export const dynamic = "force-dynamic";

const targetDistricts = new Set(["Mae Sot", "Umphang", "Tha Song Yang", "Mae Ramat", "Phop Phra"]);
const urgencyLevels = new Set(["critical", "urgent", "routine"]);
const languages = new Set(["English", "Burmese", "Thai", "Karen", "Other"]);
const allowedNeeds = new Set(["rescue", "medical", "food-water", "shelter", "transport", "accessibility", "information", "other"]);

function text(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function count(value: unknown, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= maximum ? parsed : null;
}

function coordinate(value: unknown, minimum: number, maximum: number) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed.toFixed(6) : null;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 24_000) return Response.json({ error: "Request is too large." }, { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (text(body.website, 200)) {
    return Response.json({ reference: `HWF-${Date.now().toString().slice(-8)}` }, { status: 201 });
  }

  const fullName = text(body.fullName, 120);
  const phone = text(body.phone, 32);
  const alternateContact = text(body.alternateContact, 120) || null;
  const preferredLanguage = text(body.preferredLanguage, 24);
  const district = text(body.district, 40);
  const village = text(body.village, 120);
  const locationDetails = text(body.locationDetails, 500);
  const urgency = text(body.urgency, 20);
  const details = text(body.details, 1_500);
  const peopleCount = count(body.peopleCount, 500);
  const childrenUnderFive = count(body.childrenUnderFive, 100);
  const olderAdults = count(body.olderAdults, 100);
  const latitude = coordinate(body.latitude, 14, 19);
  const longitude = coordinate(body.longitude, 96, 101);
  const rawNeeds = Array.isArray(body.needs) ? body.needs : [];
  const needs = rawNeeds.map((need) => text(need, 32)).filter((need) => allowedNeeds.has(need));

  if (!fullName || !phone || !/^\+?[0-9 ()-]{7,32}$/.test(phone)) {
    return Response.json({ error: "A valid name and phone number are required." }, { status: 400 });
  }
  if (!targetDistricts.has(district) || !village || !locationDetails) {
    return Response.json({ error: "A target district and complete location are required." }, { status: 400 });
  }
  if (!urgencyLevels.has(urgency) || !languages.has(preferredLanguage) || needs.length === 0) {
    return Response.json({ error: "Urgency, preferred language, and at least one assistance type are required." }, { status: 400 });
  }
  if (peopleCount == null || peopleCount < 1 || childrenUnderFive == null || olderAdults == null || !details || body.consent !== true) {
    return Response.json({ error: "Household details, situation description, and consent are required." }, { status: 400 });
  }
  if ((body.latitude != null && body.latitude !== "" && latitude == null) || (body.longitude != null && body.longitude !== "" && longitude == null)) {
    return Response.json({ error: "The supplied location coordinates are outside the supported area." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const reference = `HWF-${createdAt.slice(0, 10).replace(/-/g, "")}-${id.slice(0, 6).toUpperCase()}`;

  try {
    await createHelpRequest({
      id,
      reference,
      createdAt,
      urgency,
      fullName,
      phone,
      alternateContact,
      preferredLanguage,
      district,
      village,
      locationDetails,
      latitude,
      longitude,
      peopleCount,
      childrenUnderFive,
      olderAdults,
      disabilityOrMobilityNeeds: body.disabilityOrMobilityNeeds === true,
      needs: JSON.stringify(needs),
      details,
    });
  } catch {
    return Response.json({ error: "The report could not be recorded. Please try again or use an emergency hotline." }, { status: 503 });
  }

  return Response.json({ reference, createdAt }, {
    status: 201,
    headers: { "Cache-Control": "no-store" },
  });
}
