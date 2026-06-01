"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_LANG,
  LANG_COOKIE,
  translate,
  type DictKey,
  type Lang,
} from "@/lib/dictionaries";

type TFunc = (key: DictKey, params?: Record<string, string | number>) => string;

type I18nValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TFunc;
};

const I18nContext = createContext<I18nValue | null>(null);

const ONE_YEAR = 60 * 60 * 24 * 365;

export function I18nProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    document.documentElement.lang = next;
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (key, params) => translate(lang, key, params),
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback so isolated/test renders don't crash.
    return {
      lang: DEFAULT_LANG,
      setLang: () => {},
      t: (key, params) => translate(DEFAULT_LANG, key, params),
    };
  }
  return ctx;
}

/** Convenience: just the translator. */
export function useT(): TFunc {
  return useI18n().t;
}
