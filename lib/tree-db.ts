import { prisma } from "@/lib/prisma";
import type { PersonDTO, TreeDTO } from "@/lib/types";
import type { Sex } from "@/lib/validations";

type PersonRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  sex: string;
  birthDate: Date | null;
  birthPlace: string | null;
  deceased: boolean;
  deathDate: Date | null;
  deathPlace: string | null;
  positionX: number | null;
  positionY: number | null;
};

function toPersonDTO(p: PersonRow): PersonDTO {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    sex: p.sex as Sex,
    birthDate: p.birthDate ? p.birthDate.toISOString() : null,
    birthPlace: p.birthPlace,
    deceased: p.deceased,
    deathDate: p.deathDate ? p.deathDate.toISOString() : null,
    deathPlace: p.deathPlace,
    positionX: p.positionX,
    positionY: p.positionY,
  };
}

/** Load the current user's first tree (MVP: one tree per user) as a serializable DTO. */
export async function getTreeForUser(userId: string): Promise<TreeDTO | null> {
  const tree = await prisma.tree.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
    include: {
      persons: { orderBy: { createdAt: "asc" } },
      partnerships: true,
    },
  });
  if (!tree) return null;

  const personIds = new Set(tree.persons.map((p) => p.id));
  const links = await prisma.parentChild.findMany({
    where: { parentId: { in: [...personIds] } },
  });

  return {
    id: tree.id,
    name: tree.name,
    selfPersonId: tree.selfPersonId,
    persons: tree.persons.map(toPersonDTO),
    parentChild: links
      .filter((l) => personIds.has(l.childId))
      .map((l) => ({ parentId: l.parentId, childId: l.childId })),
    partnerships: tree.partnerships.map((p) => ({
      partnerAId: p.partnerAId,
      partnerBId: p.partnerBId,
    })),
  };
}

/** Verify a person belongs to a tree owned by the user; returns the treeId or null. */
export async function getOwnedPersonTreeId(
  userId: string,
  personId: string,
): Promise<string | null> {
  const person = await prisma.person.findFirst({
    where: { id: personId, tree: { ownerId: userId } },
    select: { treeId: true },
  });
  return person?.treeId ?? null;
}
