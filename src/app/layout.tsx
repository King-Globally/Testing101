import type { Metadata } from "next";
import { Noto_Serif, Source_Serif_4, Amiri, Reem_Kufi, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import AuthProvider from "@/components/AuthProvider";

const notoSerif = Noto_Serif({
  variable: "--font-serif-stack",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-display-stack",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const amiri = Amiri({
  variable: "--font-arabic-stack",
  subsets: ["arabic", "latin"],
  display: "swap",
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const reemKufi = Reem_Kufi({
  variable: "--font-arabic-display",
  subsets: ["arabic", "latin"],
  display: "swap",
  weight: ["400", "700"],
});

const ibmPlex = IBM_Plex_Sans({
  variable: "--font-sans-stack",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono-stack",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Jamiatul Ulama Johannesburg · جمعية العلماء جوهانسبرغ",
  description:
    "Verified Islamic guidance, rulings, articles, prayer times, Hijri calendar, and educational resources — grounded in the Ḥanafī school of jurisprudence.",
  keywords: [
    "Jamiat", "Jamiatul Ulama", "Johannesburg", "Islamic",
    "Fatwa", "Hanafi", "Quran", "Hadith", "Zakat", "Salah", "Ramadan",
  ],
  authors: [{ name: "Jamiatul Ulama Johannesburg" }],
  icons: {
    icon: "/jamiat-logo.png",
  },
  robots: { index: true, follow: true },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  themeColor: "#1B2A38",
  openGraph: {
    title: "Jamiatul Ulama Johannesburg",
    description: "Verified Islamic guidance, rulings, articles, and resources — Ḥanafī school.",
    siteName: "Jamiatul Ulama Johannesburg",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${notoSerif.variable} ${sourceSerif.variable} ${amiri.variable} ${reemKufi.variable} ${ibmPlex.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
