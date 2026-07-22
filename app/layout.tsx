import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { MerklisteBar } from "@/components/band/MerklisteBar";
import GridOverlay from "@/components/dev/GridOverlay";

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
    template: "%s – proudleut.com",
    default: "proudleut.com – Livebands entdecken",
  },
  description:
    "Finde die passende Liveband für dein Event – persönlich, direkt und ohne Mittelmann.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isStudio = pathname.startsWith("/studio");
  const isAdmin = pathname.startsWith("/admin");

  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className={
          isStudio
            ? "h-screen overflow-hidden"
            : isAdmin
            ? "min-h-screen bg-gray-50"
            : "min-h-full flex flex-col"
        }
      >
        {!isStudio && !isAdmin && <Header />}
        <main id="main-content" className={isStudio ? "h-screen" : "flex-1"}>{children}</main>
        {!isStudio && !isAdmin && <Footer />}
        {!isStudio && !isAdmin && <MerklisteBar />}
        {process.env.NODE_ENV === 'development' && !isStudio && !isAdmin && <GridOverlay />}
      </body>
    </html>
  );
}
