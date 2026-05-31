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
    const mother = await create(personInputToData(input.mother));
    const father = await create(personInputToData(input.father));

    const parentChild: { parentId: string; childId: string }[] = [
      { parentId: mother.id, childId: self.id },
      { parentId: father.id, childId: self.id },
    ];
    const partnerships: { partnerAId: string; partnerBId: string }[] = [
      { partnerAId: father.id, partnerBId: mother.id },
    ];

    // Maternal grandparents
    const mgm = isPersonProvided(input.maternalGrandmother)
      ? await create(personInputToData(input.maternalGrandmother))
      : null;
    const mgf = isPersonProvided(input.maternalGrandfather)
      ? await create(personInputToData(input.maternalGrandfather))
      : null;
    if (mgm) parentChild.push({ parentId: mgm.id, childId: mother.id });
    if (mgf) parentChild.push({ parentId: mgf.id, childId: mother.id });
    if (mgm && mgf)
      partnerships.push({ partnerAId: mgf.id, partnerBId: mgm.id });

    // Paternal grandparents
    const pgm = isPersonProvided(input.paternalGrandmother)
      ? await create(personInputToData(input.paternalGrandmother))
      : null;
    const pgf = isPersonProvided(input.paternalGrandfather)
      ? await create(personInputToData(input.paternalGrandfather))
      : null;
    if (pgm) parentChild.push({ parentId: pgm.id, childId: father.id });
    if (pgf) parentChild.push({ parentId: pgf.id, childId: father.id });
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
