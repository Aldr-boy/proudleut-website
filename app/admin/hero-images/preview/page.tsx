'use client'
import { useEffect, useState } from 'react'
import { HeroWall, type HeroWallImage } from '@/components/hero/HeroWall'
import { HeroContent } from '@/components/homepage/HeroContent'
import { HERO_WALL_PREVIEW_MESSAGE_TYPE, type HeroWallPreviewMessage } from '@/lib/heroWall/heroWallPreviewMessage'

// Admin-Adaption "Hero-Bilder-Vorschau" (Auftrag Abschnitt 1+2): eigene,
// echt navigierbare Route statt einer nur visuell herunterskalierten
// Kopie im Editor selbst. Wird ausschliesslich in einem <iframe> mit
// fester Breite/Hoehe (390x844 / 768x1024 / 1440x900, siehe
// HeroImagesEditor.tsx) eingebettet -- das Iframe-Element bekommt dadurch
// ein eigenes, echtes Layout-Viewport, gegen das HeroWalls
// Tailwind-Breakpoints (md/lg/xl) tatsaechlich ausloesen, unabhaengig von
// der tatsaechlichen Fenstergroesse des Admin-Browsers. Das war die
// Ursache der zuvor veralteten Vorschau: eine reine CSS-scale()-
// Verkleinerung aendert das Viewport fuer Media Queries nicht.
//
// Rendert DIESELBEN Komponenten wie die Homepage (components/hero/HeroWall
// + components/homepage/HeroContent) -- keine zweite Hero-Implementierung.
// Der unsaved Auswahl-Stand kommt per postMessage vom Editor (siehe
// lib/heroWall/heroWallPreviewMessage.ts), kein zweiter Datenspeicher,
// keine eigene DB-Abfrage, kein Save als Vorbedingung fuer die Anzeige.
//
// Durch middleware.ts wie jede /admin/*-Route session-geschuetzt; durch
// app/layout.tsx (isAdmin-Erkennung ueber x-pathname) ohne Header/Footer/
// MerklisteBar gerendert -- reine Hero-Flaeche, kein Homepage-Nachbau.
export default function HeroWallPreviewPage() {
  const [images, setImages] = useState<HeroWallImage[] | null>(null)

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      const data = event.data as Partial<HeroWallPreviewMessage> | undefined
      if (data?.type !== HERO_WALL_PREVIEW_MESSAGE_TYPE) return
      setImages(Array.isArray(data.images) ? data.images : [])
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  if (images === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pl-stage text-pl-on-stage-muted text-sm">
        Warte auf Vorschaudaten …
      </div>
    )
  }

  return (
    <HeroWall images={images}>
      <HeroContent />
    </HeroWall>
  )
}
