import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { onboardingSchema } from "@/lib/validations";
import { isPersonProvided, personInputToData } from "@/lib/person-data";
import { computeDagreLayout } from "@/lib/tree-layout";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const existing = await prisma.tree.findFirst({ where: { ownerId: userId } });
  if (existing) {
    return NextResponse.json({ error: "Tree already exists" }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const treeId = await prisma.$transaction(async (tx) => {
    const tree = await tx.tree.create({
      data: { ownerId: userId, name: "My Family Tree" },
    });

    const create = (data: ReturnType<typeof personInputToData>) =>
      tx.person.create({ data: { ...data, treeId: tree.id } });

    const self = await create(personInputToData(input.self));

    const parentChild: { parentId: string; childId: string }[] = [];
    const partnerships: { partnerAId: string; partnerBId: string }[] = [];

    // Parents are optional — only create the ones that were filled in.
    const mother = isPersonProvided(input.mother)
      ? await create(personInputToData(input.mother))
      : null;
    const father = isPersonProvided(input.father)
      ? await create(personInputToData(input.father))
      : null;
    if (mother) parentChild.push({ parentId: mother.id, childId: self.id });
    if (father) parentChild.push({ parentId: father.id, childId: self.id });
    if (mother && father)
      partnerships.push({ partnerAId: father.id, partnerBId: mother.id });

    // Maternal grandparents (only meaningful when the mother exists)
    const mgm =
      mother && isPersonProvided(input.maternalGrandmother)
        ? await create(personInputToData(input.maternalGrandmother))
        : null;
    const mgf =
      mother && isPersonProvided(input.maternalGrandfather)
        ? await create(personInputToData(input.maternalGrandfather))
        : null;
    if (mother && mgm) parentChild.push({ parentId: mgm.id, childId: mother.id });
    if (mother && mgf) parentChild.push({ parentId: mgf.id, childId: mother.id });
    if (mgm && mgf)
      partnerships.push({ partnerAId: mgf.id, partnerBId: mgm.id });

    // Paternal grandparents (only meaningful when the father exists)
    const pgm =
      father && isPersonProvided(input.paternalGrandmother)
        ? await create(personInputToData(input.paternalGrandmother))
        : null;
    const pgf =
      father && isPersonProvided(input.paternalGrandfather)
        ? await create(personInputToData(input.paternalGrandfather))
        : null;
    if (father && pgm) parentChild.push({ parentId: pgm.id, childId: father.id });
    if (father && pgf) parentChild.push({ parentId: pgf.id, childId: father.id });
    if (pgm && pgf)
      partnerships.push({ partnerAId: pgf.id, partnerBId: pgm.id });

    await tx.parentChild.createMany({ data: parentChild });
    await tx.partnership.createMany({
      data: partnerships.map((p) => ({ ...p, treeId: tree.id })),
    });
    await tx.tree.update({
      where: { id: tree.id },
      data: { selfPersonId: self.id },
    });

    // Seed canvas positions with an initial dagre layout.
    const persons = await tx.person.findMany({
      where: { treeId: tree.id },
      select: { id: true },
    });
    const layout = computeDagreLayout(persons, parentChild);
    await Promise.all(
      [...layout.entries()].map(([id, pos]) =>
        tx.person.update({
          where: { id },
          data: { positionX: pos.x, positionY: pos.y },
        }),
      ),
    );

    return tree.id;
  });

  return NextResponse.json({ ok: true, treeId }, { status: 201 });
}
