import type { Metadata } from "next";
import "./globals.css";
import { Montserrat, Dancing_Script } from 'next/font/google';

// Configurar las fuentes usando la API de Next.js
const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
  weight: ['300', '400', '500', '600', '700'],
});

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dancing-script',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: "Coiffure Ciwan - Peluquería Moderna para Hombres y Niños",
  description: "Peluquería masculina especializada en cortes modernos, fades, barbas y estilos para hombres y niños. Reserva tu cita hoy.",
  keywords: "peluquería hombres, barbería, corte de pelo, fade, barba, peluquería niños",
  authors: [{ name: "Coiffure Ciwan" }],
  openGraph: {
    title: "Coiffure Ciwan - Peluquería Moderna para Hombres y Niños",
    description: "Especialistas en cortes modernos y estilos para hombres y niños",
    url: "https://coiffureciwan.ch",
    siteName: "Coiffure Ciwan",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Coiffure Ciwan",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`scroll-smooth ${montserrat.variable} ${dancingScript.variable}`}>
      <body className={montserrat.className}>
        {children}
      </body>
    </html>
  );
}
