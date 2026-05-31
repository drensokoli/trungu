import type { Sex } from "./validations";

/** Serialized person sent to the client (dates as ISO strings). */
export type PersonDTO = {
  id: string;
  firstName: string;
  lastName: string | null;
  sex: Sex;
  birthDate: string | null;
  birthPlace: string | null;
  deceased: boolean;
  deathDate: string | null;
  deathPlace: string | null;
  positionX: number | null;
  positionY: number | null;
};

export type TreeDTO = {
  id: string;
  name: string;
  selfPersonId: string | null;
  persons: PersonDTO[];
  /** parent -> child edges */
  parentChild: { parentId: string; childId: string }[];
  /** partner pairs (undirected) */
  partnerships: { partnerAId: string; partnerBId: string }[];
};
