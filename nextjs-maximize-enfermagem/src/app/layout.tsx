import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
