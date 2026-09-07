import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { MerklisteBar } from "@/components/band/MerklisteBar";
import GridOverlay from "@/components/dev/GridOverlay";
import { SITE_URL, SITE_DEFAULT_DESCRIPTION } from "@/lib/seo/metadata";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s – proudleut.com",
    default: "proudleut.com – Livebands entdecken",
  },
  description: SITE_DEFAULT_DESCRIPTION,
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
