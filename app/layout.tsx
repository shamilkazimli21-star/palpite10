import "./globals.css";
import MetaPixel from "@/components/MetaPixel";

export const metadata = {
  title: "PALPITE10",
  description:
    "Palpites e análises de futebol.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <MetaPixel />
        {children}
      </body>
    </html>
  );
}
