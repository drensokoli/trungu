import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tree = await prisma.tree.findFirst({
    where: { ownerId: session.user.id },
    select: { id: true },
  });
  redirect(tree ? "/tree" : "/onboarding");
}
