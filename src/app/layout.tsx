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
  title: "Coiffure Ciwan - Salon de Coiffure Moderne pour Hommes et Enfants",
  description: "Salon de coiffure pour hommes spécialisé dans les coupes modernes, dégradés, barbes et styles pour hommes et enfants. Réservez votre rendez-vous aujourd'hui.",
  keywords: "coiffure hommes, barbier, coupe de cheveux, dégradé, barbe, coiffure enfants",
  authors: [{ name: "Coiffure Ciwan" }],
  openGraph: {
    title: "Coiffure Ciwan - Salon de Coiffure Moderne pour Hommes et Enfants",
    description: "Spécialistes en coupes modernes et styles pour hommes et enfants",
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
