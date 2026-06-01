"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { ThemeProvider } from "./theme-provider";
import { I18nProvider } from "@/lib/i18n";
import type { Lang } from "@/lib/dictionaries";

export function Providers({
  children,
  lang,
}: {
  children: ReactNode;
  lang: Lang;
}) {
  return (
    <SessionProvider>
      <I18nProvider initialLang={lang}>
        <ThemeProvider>{children}</ThemeProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
