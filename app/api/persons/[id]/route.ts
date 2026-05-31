import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updatePersonSchema } from "@/lib/validations";
import { parseDateString } from "@/lib/person-data";
import { getOwnedPersonTreeId } from "@/lib/tree-db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const treeId = await getOwnedPersonTreeId(session.user.id, id);
  if (!treeId) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const parsed = updatePersonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  if (input.firstName !== undefined) data.firstName = input.firstName.trim();
  if (input.lastName !== undefined) data.lastName = input.lastName?.trim() || null;
  if (input.sex !== undefined) data.sex = input.sex;
  if (input.birthDate !== undefined)
    data.birthDate = input.birthDate ? parseDateString(input.birthDate) : null;
  if (input.birthPlace !== undefined)
    data.birthPlace = input.birthPlace?.trim() || null;
  if (input.positionX !== undefined) data.positionX = input.positionX;
  if (input.positionY !== undefined) data.positionY = input.positionY;

  if (input.deceased !== undefined) {
    data.deceased = input.deceased;
    if (input.deceased === false) {
      data.deathDate = null;
      data.deathPlace = null;
    }
  }
  if (data.deceased !== false) {
    if (input.deathDate !== undefined)
      data.deathDate = input.deathDate ? parseDateString(input.deathDate) : null;
    if (input.deathPlace !== undefined)
      data.deathPlace = input.deathPlace?.trim() || null;
  }

  await prisma.person.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const treeId = await getOwnedPersonTreeId(session.user.id, id);
  if (!treeId) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  // If this is the tree's self-person, clear the pointer first.
  await prisma.tree.updateMany({
    where: { id: treeId, selfPersonId: id },
    data: { selfPersonId: null },
  });
  await prisma.person.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
