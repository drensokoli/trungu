import type { PersonInput } from "@/lib/validations";

/** Parse a "YYYY-MM-DD" string (or empty) into a UTC Date or null. */
export function parseDateString(value: string | undefined | null): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Normalize a PersonInput into Prisma-ready person fields. */
export function personInputToData(input: PersonInput) {
  const deceased = Boolean(input.deceased);
  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName?.trim() || null,
    sex: input.sex,
    birthDate: parseDateString(input.birthDate),
    birthPlace: input.birthPlace?.trim() || null,
    deceased,
    deathDate: deceased ? parseDateString(input.deathDate) : null,
    deathPlace: deceased ? input.deathPlace?.trim() || null : null,
  };
}

/** True when a person block was meaningfully filled (has a first name). */
export function isPersonProvided(input?: PersonInput | null): input is PersonInput {
  return Boolean(input && input.firstName && input.firstName.trim().length > 0);
}
