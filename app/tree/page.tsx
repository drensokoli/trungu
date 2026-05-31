import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTreeForUser } from "@/lib/tree-db";
import { TreeCanvas } from "@/components/tree/tree-canvas";

export default async function TreePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tree = await getTreeForUser(session.user.id);
  if (!tree) redirect("/onboarding");

  return <TreeCanvas initialTree={tree} />;
}
