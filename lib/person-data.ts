import { flexToParts } from "@/lib/flex-date";
import type { PersonInput } from "@/lib/validations";

/** Parse a flexible date token (or empty) into a UTC Date or null. */
export function parseDateString(value: string | undefined | null): Date | null {
  return flexToParts(value).date;
}

/** Decompose a flexible date token into Prisma columns (date + precision + approx). */
export function dateFieldsFromToken(token: string | undefined | null) {
  const { date, precision, approx } = flexToParts(token);
  return { date, precision, approx };
}

/** Normalize a PersonInput into Prisma-ready person fields. */
export function personInputToData(input: PersonInput) {
  const deceased = Boolean(input.deceased);
  const birth = flexToParts(input.birthDate);
  const death = deceased
    ? flexToParts(input.deathDate)
    : { date: null, precision: "DAY" as const, approx: false };
  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName?.trim() || null,
    sex: input.sex,
    birthDate: birth.date,
    birthPrecision: birth.precision,
    birthApprox: birth.approx,
    birthPlace: input.birthPlace?.trim() || null,
    deceased,
    deathDate: death.date,
    deathPrecision: death.precision,
    deathApprox: death.approx,
    deathPlace: deceased ? input.deathPlace?.trim() || null : null,
  };
}

/** True when a person block was meaningfully filled (has a first name). */
export function isPersonProvided(input?: PersonInput | null): input is PersonInput {
  return Boolean(input && input.firstName && input.firstName.trim().length > 0);
}
