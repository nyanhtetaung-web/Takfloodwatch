import { createDamageAssessment } from "../../../db/damageAssessments";

export const dynamic = "force-dynamic";

const targetDistricts = new Set(["Mae Sot", "Umphang", "Tha Song Yang", "Mae Ramat", "Phop Phra"]);
const severityLevels = new Set(["minor", "moderate", "major", "destroyed"]);
const accessLevels = new Set(["safe", "limited", "unsafe", "inaccessible"]);
const allowedCategories = new Set(["homes", "roads", "agriculture", "water-sanitation", "power-communications", "school-clinic", "business", "other"]);
const allowedHazards = new Set(["fast-water", "collapse", "landslide", "electrical", "contamination", "debris", "none-known"]);

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

function validEvidenceUrl(value: unknown) {
  const candidate = text(value, 500);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 28_000) {
    return Response.json({ error: "Assessment is too large." }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid assessment." }, { status: 400 });
  }

  if (text(body.website, 200)) {
    return Response.json({ reference: `DMG-${Date.now().toString().slice(-8)}` }, { status: 201 });
  }

  const assessorName = text(body.assessorName, 120);
  const phone = text(body.phone, 32);
  const organization = text(body.organization, 160) || null;
  const observedAt = text(body.observedAt, 40);
  const district = text(body.district, 40);
  const village = text(body.village, 120);
  const locationDetails = text(body.locationDetails, 500);
  const severity = text(body.severity, 20);
  const accessStatus = text(body.accessStatus, 20);
  const latitude = coordinate(body.latitude, 14, 19);
  const longitude = coordinate(body.longitude, 96, 101);
  const floodDepthCm = count(body.floodDepthCm, 2_000);
  const householdsAffected = count(body.householdsAffected, 100_000);
  const peopleAffected = count(body.peopleAffected, 500_000);
  const peopleDisplaced = count(body.peopleDisplaced, 500_000);
  const peopleInjured = count(body.peopleInjured, 100_000);
  const structuresDamaged = count(body.structuresDamaged, 100_000);
  const structuresDestroyed = count(body.structuresDestroyed, 100_000);
  const categories = (Array.isArray(body.categories) ? body.categories : []).map((item) => text(item, 40)).filter((item) => allowedCategories.has(item));
  const hazards = (Array.isArray(body.hazards) ? body.hazards : []).map((item) => text(item, 40)).filter((item) => allowedHazards.has(item));
  const evidenceUrl = validEvidenceUrl(body.evidenceUrl);
  const description = text(body.description, 2_000);

  if (!assessorName || !phone || !/^\+?[0-9 ()-]{7,32}$/.test(phone)) {
    return Response.json({ error: "A valid assessor name and phone number are required." }, { status: 400 });
  }
  if (!observedAt || Number.isNaN(Date.parse(observedAt))) {
    return Response.json({ error: "A valid observation date and time are required." }, { status: 400 });
  }
  if (!targetDistricts.has(district) || !village || !locationDetails) {
    return Response.json({ error: "A target district and complete location are required." }, { status: 400 });
  }
  if (!severityLevels.has(severity) || !accessLevels.has(accessStatus) || categories.length === 0 || !description) {
    return Response.json({ error: "Severity, access, damage categories, and description are required." }, { status: 400 });
  }
  if (hazards.includes("none-known") && hazards.length > 1) {
    return Response.json({ error: "No known hazard cannot be combined with another hazard." }, { status: 400 });
  }
  if ([floodDepthCm, householdsAffected, peopleAffected, peopleDisplaced, peopleInjured, structuresDamaged, structuresDestroyed].some((value) => value == null)) {
    return Response.json({ error: "Damage counts must be valid non-negative numbers." }, { status: 400 });
  }
  if ((body.latitude != null && body.latitude !== "" && latitude == null) || (body.longitude != null && body.longitude !== "" && longitude == null)) {
    return Response.json({ error: "The supplied coordinates are outside the supported area." }, { status: 400 });
  }
  if (text(body.evidenceUrl, 500) && evidenceUrl == null) {
    return Response.json({ error: "Evidence link must be a valid web address." }, { status: 400 });
  }
  if (body.consent !== true) {
    return Response.json({ error: "Confirmation is required before submission." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const reference = `DMG-${createdAt.slice(0, 10).replace(/-/g, "")}-${id.slice(0, 6).toUpperCase()}`;

  try {
    await createDamageAssessment({
      id,
      reference,
      createdAt,
      assessorName,
      phone,
      organization,
      observedAt,
      district,
      village,
      locationDetails,
      latitude,
      longitude,
      severity,
      accessStatus,
      waterPresent: body.waterPresent === true,
      floodDepthCm: floodDepthCm!,
      householdsAffected: householdsAffected!,
      peopleAffected: peopleAffected!,
      peopleDisplaced: peopleDisplaced!,
      peopleInjured: peopleInjured!,
      structuresDamaged: structuresDamaged!,
      structuresDestroyed: structuresDestroyed!,
      categories: JSON.stringify(categories),
      hazards: JSON.stringify(hazards),
      evidenceUrl,
      description,
    });
  } catch {
    return Response.json({ error: "The assessment could not be recorded. Please try again." }, { status: 503 });
  }

  return Response.json({ reference, createdAt }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
