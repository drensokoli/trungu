import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { auth, googleEnabled } from "@/lib/auth";

export default async function SignupPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <AuthShell title="Create your account" subtitle="Start building your family tree">
      <SignupForm googleEnabled={googleEnabled} />
    </AuthShell>
  );
}
