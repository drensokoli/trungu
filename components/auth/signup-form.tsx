"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "./google-button";
import { useT } from "@/lib/i18n";

export function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("auth.createFailed"));
        return;
      }
      const signin = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (signin?.error) {
        setError(t("auth.createdLogIn"));
        router.push("/login");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {googleEnabled && (
        <>
          <GoogleButton label={t("auth.signupGoogle")} />
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            {t("auth.or")}
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">{t("auth.fullName")}</Label>
          <Input
            id="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted">{t("auth.passwordHint")}</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          {t("auth.signup.submit")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          {t("auth.toLogin")}
        </Link>
      </p>
    </div>
  );
}
