import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { auth, googleEnabled } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your family tree">
      <LoginForm googleEnabled={googleEnabled} />
    </AuthShell>
  );
}
