"use client";

import type { ReactNode } from "react";
import { TreePine } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useT } from "@/lib/i18n";
import type { DictKey } from "@/lib/dictionaries";

export function AuthShell({
  titleKey,
  subtitleKey,
  children,
}: {
  titleKey: DictKey;
  subtitleKey: DictKey;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-surface-2 px-4 py-10">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-sm">
            <TreePine className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{t(titleKey)}</h1>
            <p className="mt-1 text-sm text-muted">{t(subtitleKey)}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
