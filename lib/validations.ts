import { z } from "zod";

export const sexEnum = z.enum(["MALE", "FEMALE", "UNKNOWN"]);
export type Sex = z.infer<typeof sexEnum>;

// A flexible date token: optional "~" (approximate) + YYYY | YYYY-MM | YYYY-MM-DD,
// covering year-only, month, and full-day precision. Empty means "unknown".
const FLEX_DATE_RE =
  /^~?\d{4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/;
const dateString = z
  .string()
  .trim()
  .refine((v) => v === "" || FLEX_DATE_RE.test(v), "Use a valid date")
  .optional()
  .or(z.literal(""));

export const personSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().max(80).optional().or(z.literal("")),
  sex: sexEnum.default("UNKNOWN"),
  birthDate: dateString,
  birthPlace: z.string().trim().max(160).optional().or(z.literal("")),
  deceased: z.boolean().default(false),
  deathDate: dateString,
  deathPlace: z.string().trim().max(160).optional().or(z.literal("")),
});

export type PersonInput = z.infer<typeof personSchema>;

// Onboarding: self + parents + 4 optional grandparents.
const optionalPerson = personSchema.optional();

export const onboardingSchema = z.object({
  self: personSchema,
  mother: optionalPerson,
  father: optionalPerson,
  maternalGrandmother: optionalPerson,
  maternalGrandfather: optionalPerson,
  paternalGrandmother: optionalPerson,
  paternalGrandfather: optionalPerson,
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const signupSchema = z.object({
  name: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters").max(100),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const relationEnum = z.enum(["parent", "sibling", "child", "spouse"]);
export type Relation = z.infer<typeof relationEnum>;

export const addPersonSchema = z.object({
  sourcePersonId: z.string().min(1),
  relation: relationEnum,
  person: personSchema,
  // Only meaningful when relation === "spouse": is this a current partner?
  current: z.boolean().default(true),
});
export type AddPersonInput = z.infer<typeof addPersonSchema>;

export const updatePersonSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().max(80).nullable().optional(),
  sex: sexEnum.optional(),
  birthDate: dateString.nullable(),
  birthPlace: z.string().trim().max(160).nullable().optional(),
  deceased: z.boolean().optional(),
  deathDate: dateString.nullable(),
  deathPlace: z.string().trim().max(160).nullable().optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
});
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
