import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import "@xyflow/react/dist/style.css";
import { Providers } from "@/components/providers";
import { LANG_COOKIE, normalizeLang } from "@/lib/dictionaries";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Family Tree",
  description: "Build and explore your family tree.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = normalizeLang((await cookies()).get(LANG_COOKIE)?.value);
  return (
    <html
      lang={lang}
      className={`${inter.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <Providers lang={lang}>{children}</Providers>
      </body>
    </html>
  );
}
