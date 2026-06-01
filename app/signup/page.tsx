import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { auth, googleEnabled } from "@/lib/auth";

export default async function SignupPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <AuthShell titleKey="auth.signup.title" subtitleKey="auth.signup.subtitle">
      <SignupForm googleEnabled={googleEnabled} />
    </AuthShell>
  );
}
