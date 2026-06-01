import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { addPersonSchema } from "@/lib/validations";
import { personInputToData } from "@/lib/person-data";
import { getTreeForUser } from "@/lib/tree-db";
import { NODE_HEIGHT, NODE_WIDTH, SPOUSE_GAP } from "@/lib/tree-layout";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = addPersonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { sourcePersonId, relation, person, current } = parsed.data;

  const source = await prisma.person.findFirst({
    where: { id: sourcePersonId, tree: { ownerId: session.user.id } },
  });
  if (!source) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }
  const treeId = source.treeId;

  // A person can have at most two parents.
  if (relation === "parent") {
    const existing = await prisma.parentChild.count({
      where: { childId: source.id },
    });
    if (existing >= 2) {
      return NextResponse.json(
        { error: "This person already has two parents." },
        { status: 400 },
      );
    }
  }

  // Offset the new card relative to its source so it doesn't overlap.
  const sx = source.positionX ?? 0;
  const sy = source.positionY ?? 0;
  const offset: Record<typeof relation, { x: number; y: number }> = {
    parent: { x: 0, y: -(NODE_HEIGHT + 110) },
    child: { x: 0, y: NODE_HEIGHT + 110 },
    sibling: { x: NODE_WIDTH + 60, y: 0 },
    spouse: { x: NODE_WIDTH + SPOUSE_GAP, y: 0 },
  };

  await prisma.$transaction(async (tx) => {
    const created = await tx.person.create({
      data: {
        ...personInputToData(person),
        treeId,
        positionX: sx + offset[relation].x,
        positionY: sy + offset[relation].y,
      },
    });

    if (relation === "parent") {
      await tx.parentChild.create({
        data: { parentId: created.id, childId: source.id },
      });
      // If the source already had exactly one parent, pair them up.
      const existingParents = await tx.parentChild.findMany({
        where: { childId: source.id, NOT: { parentId: created.id } },
      });
      if (existingParents.length === 1) {
        await tx.partnership.create({
          data: {
            treeId,
            partnerAId: existingParents[0].parentId,
            partnerBId: created.id,
          },
        });
      }
    } else if (relation === "spouse") {
      await tx.partnership.create({
        data: {
          treeId,
          partnerAId: source.id,
          partnerBId: created.id,
          current,
        },
      });
    } else if (relation === "child") {
      await tx.parentChild.create({
        data: { parentId: source.id, childId: created.id },
      });
      // Co-parent: if the source has a partner, link them as a parent too.
      const partnership = await tx.partnership.findFirst({
        where: {
          OR: [{ partnerAId: source.id }, { partnerBId: source.id }],
        },
      });
      if (partnership) {
        const partnerId =
          partnership.partnerAId === source.id
            ? partnership.partnerBId
            : partnership.partnerAId;
        await tx.parentChild.create({
          data: { parentId: partnerId, childId: created.id },
        });
      }
    } else {
      // sibling: share the source's parents
      const parents = await tx.parentChild.findMany({
        where: { childId: source.id },
      });
      if (parents.length > 0) {
        await tx.parentChild.createMany({
          data: parents.map((p) => ({
            parentId: p.parentId,
            childId: created.id,
          })),
        });
      }
    }
  });

  const tree = await getTreeForUser(session.user.id);
  return NextResponse.json({ tree }, { status: 201 });
}
