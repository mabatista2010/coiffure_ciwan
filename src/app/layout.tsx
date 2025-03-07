import type { Metadata } from "next";
import "./globals.css";
import { Dancing_Script, Montserrat } from "next/font/google";

// Importar la fuente Dancing Script
const dancingScript = Dancing_Script({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-dancing-script",
});

// Importar la fuente principal Montserrat
const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Coiffure Ciwan - Peluquería Moderna para Hombres y Niños",
  description: "Peluquería masculina especializada en cortes modernos, fades, barbas y estilos para hombres y niños. Reserva tu cita hoy.",
  keywords: "peluquería hombres, barbería, corte de pelo, fade, barba, peluquería niños",
  authors: [{ name: "Coiffure Ciwan" }],
  openGraph: {
    title: "Coiffure Ciwan - Peluquería Moderna para Hombres y Niños",
    description: "Especialistas en cortes modernos y estilos para hombres y niños",
    url: "https://coiffureciwan.com",
    siteName: "Coiffure Ciwan",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Coiffure Ciwan",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
