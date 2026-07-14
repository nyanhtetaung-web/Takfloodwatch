import { ensureDatabaseSchema, getDatabase } from "./turso";

export type HelpRequestRecord = {
  id: string;
  reference: string;
  createdAt: string;
  urgency: string;
  fullName: string;
  phone: string;
  alternateContact: string | null;
  preferredLanguage: string;
  district: string;
  village: string;
  locationDetails: string;
  latitude: string | null;
  longitude: string | null;
  peopleCount: number;
  childrenUnderFive: number;
  olderAdults: number;
  disabilityOrMobilityNeeds: boolean;
  needs: string;
  details: string;
};

export async function createHelpRequest(record: HelpRequestRecord) {
  await ensureDatabaseSchema();
  return getDatabase().execute({
    sql: `
    INSERT INTO help_requests (
      id, reference, created_at, status, urgency, full_name, phone, alternate_contact,
      preferred_language, district, village, location_details, latitude, longitude,
      people_count, children_under_five, older_adults, disability_or_mobility_needs,
      needs, details
    ) VALUES (
      ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )`,
    args: [
      record.id, record.reference, record.createdAt, record.urgency, record.fullName,
      record.phone, record.alternateContact, record.preferredLanguage, record.district,
      record.village, record.locationDetails, record.latitude, record.longitude,
      record.peopleCount, record.childrenUnderFive, record.olderAdults,
      record.disabilityOrMobilityNeeds ? 1 : 0, record.needs, record.details,
    ],
  });
}
