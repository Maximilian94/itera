import type { Metadata } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Maximize Enfermagem — Questões para Concursos de Enfermagem",
    template: "%s | Maximize Enfermagem",
  },
  description:
    "Plataforma de questões exclusiva para concursos públicos de enfermagem. Estude com metodologia baseada em evidências: Retrieval Practice, Repetição Espaçada e Feedback Imediato.",
  keywords: [
    "concurso enfermagem",
    "questões enfermagem",
    "concurso público enfermeiro",
    "estudo para concurso",
    "enfermagem concurso",
    "questões comentadas enfermagem",
  ],
  openGraph: {
    title: "Maximize Enfermagem — Questões para Concursos de Enfermagem",
    description:
      "Plataforma de questões exclusiva para concursos públicos de enfermagem. Metodologia baseada em evidências científicas.",
    type: "website",
    locale: "pt_BR",
  },
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={manrope.variable} suppressHydrationWarning>
      <body
        className={`${manrope.className} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
