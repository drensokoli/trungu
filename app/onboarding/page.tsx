import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const existing = await prisma.tree.findFirst({
    where: { ownerId: session.user.id },
    select: { id: true },
  });
  if (existing) redirect("/tree");

  const fullName = session.user.name?.trim() ?? "";
  const [firstName, ...rest] = fullName.split(/\s+/);

  return (
    <OnboardingWizard
      initialFirstName={firstName ?? ""}
      initialLastName={rest.join(" ")}
    />
  );
}
