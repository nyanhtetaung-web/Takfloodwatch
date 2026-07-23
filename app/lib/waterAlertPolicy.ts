const MAX_WATER_OBSERVATION_AGE_MS = 3 * 60 * 60 * 1000;
const MAX_FUTURE_CLOCK_SKEW_MS = 30 * 60 * 1000;

type WaterObservation = {
  observedAt: string;
  situationLevel: number;
  bankDistanceM: number;
};

type SourcedWarning = {
  sourceName: string;
  sourceUrl: string | null;
  observedAt: string | null;
};

export function parseThaiWaterObservedAt(value: string | null | undefined) {
  const observedAt = value?.trim();
  if (!observedAt) return Number.NaN;

  const normalized = observedAt.replace(" ", "T");
  const includesTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  return Date.parse(includesTimezone ? normalized : `${normalized}+07:00`);
}

export function isFreshWaterObservation(observedAt: string, now = Date.now()) {
  const observedAtMs = parseThaiWaterObservedAt(observedAt);
  if (!Number.isFinite(observedAtMs)) return false;
  const ageMs = now - observedAtMs;
  return ageMs >= -MAX_FUTURE_CLOCK_SKEW_MS && ageMs <= MAX_WATER_OBSERVATION_AGE_MS;
}

export function isEmergencyWaterObservation(observation: WaterObservation, now = Date.now()) {
  if (!isFreshWaterObservation(observation.observedAt, now)) return false;
  return observation.situationLevel === 4 || observation.situationLevel === 5;
}

export function isThaiWaterWarning(warning: SourcedWarning) {
  return `${warning.sourceName} ${warning.sourceUrl ?? ""}`.toLowerCase().includes("thaiwater");
}

export function isOperationallyCurrentWarning(warning: SourcedWarning, now = Date.now()) {
  return !isThaiWaterWarning(warning) || isFreshWaterObservation(warning.observedAt ?? "", now);
}
