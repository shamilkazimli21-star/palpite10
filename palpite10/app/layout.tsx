import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import MetaPixel from "@/components/MetaPixel";
import "./globals.css";

const appUrl = process.env.APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);

export const metadata: Metadata = {
  ...(appUrl ? { metadataBase: new URL(appUrl) } : {}),
  title: "PALPITE10 — 1 palpite de futebol grátis por dia, no Telegram",
  description: "Receba 1 palpite de futebol baseado em dados por dia, de graça, no canal do PALPITE10 no Telegram. Para maiores de 18 anos.",
  openGraph: { title: "PALPITE10", description: "1 palpite de futebol grátis por dia, baseado em dados, direto no Telegram.", locale: "pt_BR", type: "website" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#0b3d24", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <MetaPixel pixelId={process.env.META_PIXEL_ID} />
      </body>
    </html>
  );
}
