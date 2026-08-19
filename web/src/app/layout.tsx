import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./mobile-optimizations.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://syrena-web-new.vercel.app"),
  title: "Pocket Compass - Places Worth Finding",
  description: "Your field journal for travel: an AI guide with taste, day-by-day trip itineraries, and a map of places you and your friends love. Created by Jeremy Uys.",
  authors: [{ name: "Jeremy Uys" }],
  creator: "Jeremy Uys",
  publisher: "Jeremy Uys",
  keywords: [
    "Pocket Compass", "Jeremy Uys", "AI travel guide", "trip planner",
    "travel itinerary", "places to visit", "travel companion",
  ],
  openGraph: {
    title: "Pocket Compass - Places Worth Finding",
    description: "Your field journal for travel: an AI guide with taste, day-by-day itineraries, and a map of places you and your friends love.",
    url: "https://syrena-web-new.vercel.app",
    siteName: "Pocket Compass",
    type: "website",
    images: [{ url: "/pocket-compass-star.png", width: 256, height: 256, alt: "Pocket Compass" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pocket Compass"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FAF6EF",
};

// Structured data so Google associates the app with its creator
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Pocket Compass",
  url: "https://syrena-web-new.vercel.app",
  applicationCategory: "TravelApplication",
  description: "An AI travel guide with taste: poetic recommendations, day-by-day itineraries, and a map of places you and your friends love.",
  author: { "@type": "Person", name: "Jeremy Uys" },
  creator: { "@type": "Person", name: "Jeremy Uys" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {children}
      </body>
    </html>
  );
}
