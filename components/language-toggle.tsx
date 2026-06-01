"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Toggle between the available languages (currently EN ⇄ SQ). Shows the code of
 * the language you'd switch *to* so the action is obvious at a glance.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const next = lang === "en" ? "sq" : "en";

  return (
    <button
      type="button"
      aria-label={t("lang.change")}
      title={t("lang.change")}
      onClick={() => setLang(next)}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground",
        className,
      )}
    >
      <Languages className="h-[18px] w-[18px]" />
      <span className="text-xs font-semibold uppercase">{next}</span>
    </button>
  );
}
