import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTreeForUser } from "@/lib/tree-db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tree = await getTreeForUser(session.user.id);
  if (!tree) {
    return NextResponse.json({ error: "No tree" }, { status: 404 });
  }
  return NextResponse.json({ tree });
}
