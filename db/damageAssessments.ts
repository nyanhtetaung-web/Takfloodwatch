import { ensureDatabaseSchema, getDatabase } from "./turso";

export type DamageAssessmentRecord = {
  id: string;
  reference: string;
  createdAt: string;
  assessorName: string;
  phone: string;
  organization: string | null;
  observedAt: string;
  district: string;
  village: string;
  locationDetails: string;
  latitude: string | null;
  longitude: string | null;
  severity: string;
  accessStatus: string;
  waterPresent: boolean;
  floodDepthCm: number;
  householdsAffected: number;
  peopleAffected: number;
  peopleDisplaced: number;
  peopleInjured: number;
  structuresDamaged: number;
  structuresDestroyed: number;
  categories: string;
  hazards: string;
  evidenceUrl: string | null;
  description: string;
};

export async function createDamageAssessment(record: DamageAssessmentRecord) {
  await ensureDatabaseSchema();
  return getDatabase().execute({
    sql: `
    INSERT INTO damage_assessments (
      id, reference, created_at, status, assessor_name, phone, organization, observed_at,
      district, village, location_details, latitude, longitude, severity, access_status,
      water_present, flood_depth_cm, households_affected, people_affected, people_displaced,
      people_injured, structures_damaged, structures_destroyed, categories, hazards,
      evidence_url, description
    ) VALUES (
      ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )`,
    args: [
      record.id, record.reference, record.createdAt, record.assessorName, record.phone,
      record.organization, record.observedAt, record.district, record.village,
      record.locationDetails, record.latitude, record.longitude, record.severity,
      record.accessStatus, record.waterPresent ? 1 : 0, record.floodDepthCm,
      record.householdsAffected, record.peopleAffected, record.peopleDisplaced,
      record.peopleInjured, record.structuresDamaged, record.structuresDestroyed,
      record.categories, record.hazards, record.evidenceUrl, record.description,
    ],
  });
}
