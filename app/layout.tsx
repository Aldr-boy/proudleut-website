import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { MerklisteBar } from "@/components/band/MerklisteBar";
import GridOverlay from "@/components/dev/GridOverlay";
import { Fathom } from "@/components/analytics/Fathom";
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

  // Fathom Analytics: ausschliesslich in Produktion, ausschliesslich auf
  // der echten proudleut.com-Domain (nicht auf der *.vercel.app-
  // Produktions-URL -- die traegt denselben VERCEL_ENV="production", der
  // Host-Vergleich ist die zusaetzliche Absicherung dagegen), nie auf
  // /admin/* oder /studio/*. Alles serverseitig entschieden (Host-Header,
  // kein Middleware-Zutun noetig -- "host" ist ein normaler, immer
  // vorhandener Request-Header), damit die Tracking-Komponente auf jeder
  // anderen Domain/Umgebung erst gar nicht ausgeliefert wird.
  const host = headersList.get("host") ?? "";
  const isProductionDomain = host === "proudleut.com" || host === "www.proudleut.com";
  const fathomSiteId = process.env.NEXT_PUBLIC_FATHOM_SITE_ID;
  const shouldTrackFathom =
    process.env.VERCEL_ENV === "production" &&
    isProductionDomain &&
    !isStudio &&
    !isAdmin &&
    !!fathomSiteId;

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
        {shouldTrackFathom && <Fathom siteId={fathomSiteId!} />}
        {!isStudio && !isAdmin && <Header />}
        <main id="main-content" className={isStudio ? "h-screen" : "flex-1"}>{children}</main>
        {!isStudio && !isAdmin && <Footer />}
        {!isStudio && !isAdmin && <MerklisteBar />}
        {process.env.NODE_ENV === 'development' && !isStudio && !isAdmin && <GridOverlay />}
      </body>
    </html>
  );
}
